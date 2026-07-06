import { generateMockSnapshot, generateMockTrack } from "@/lib/mock";
import type {
  Aircraft,
  FlightStatus,
  TelemetrySnapshot,
  TrackPath,
  TrackPoint,
} from "@/lib/types";

/**
 * Server-only OpenSky Network client.
 *
 * Credentials never leave the server: the browser talks to our own
 * /api/opensky/states route, which calls this module. Supports the OAuth2
 * client-credentials flow (https://opensky-network.org/data/api) and falls
 * back to the anonymous tier when no credentials are configured.
 */

const TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const STATES_URL = "https://opensky-network.org/api/states/all?extended=1";

/**
 * Optional relay base URL (see opensky-relay/). Vercel's serverless egress
 * IPs appear to be blocked/dropped by OpenSky at the network level (connect
 * timeouts even from a region physically close to OpenSky's servers, while
 * the same request succeeds instantly from a residential IP or other
 * non-datacenter network). When set, every OpenSky request is routed through
 * this relay (a Cloudflare Worker or similar, running on a network OpenSky
 * doesn't block) instead of fetching opensky-network.org directly.
 */
const RELAY_URL = process.env.OPENSKY_RELAY_URL;

function relayedUrl(upstream: string): string {
  if (!RELAY_URL) return upstream;
  return `${RELAY_URL}?upstream=${encodeURIComponent(upstream)}`;
}

/** Serve the same upstream snapshot to all clients for this long. */
const SNAPSHOT_TTL_MS = 12_000;

const ALERT_SQUAWKS = new Set(["7500", "7600", "7700"]);

/** Vertical rate (m/s) beyond which we call it a climb/descent. */
const PHASE_RATE_THRESHOLD = 2;

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
let snapshotCache: TelemetrySnapshot | null = null;
let inflight: Promise<TelemetrySnapshot> | null = null;

export class OpenSkyError extends Error {
  constructor(
    message: string,
    public readonly rateLimited = false,
  ) {
    super(message);
    this.name = "OpenSkyError";
  }
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  let res: Response;
  try {
    res = await fetch(relayedUrl(TOKEN_URL), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
      // Auth server flakiness (DNS/connect issues, slow TLS) shouldn't eat
      // the whole request budget — fail fast onto the anonymous tier below
      // rather than hanging on undici's much longer default connect timeout,
      // which previously bubbled all the way up and tripped fetchTelemetry-
      // Snapshot's mock-data fallback even though bad/unreachable credentials
      // were only ever meant to degrade to anonymous access, not to mock.
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error("OpenSky token request failed:", error);
    return null;
  }
  if (!res.ok) {
    // Bad credentials shouldn't take the whole feed down — fall back to
    // anonymous access and let the route keep serving data.
    console.error(`OpenSky token request failed: ${res.status}`);
    return null;
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

type StateRow = (string | number | boolean | null)[];

function deriveStatus(
  onGround: boolean,
  verticalRate: number | null,
  squawk: string | null,
): FlightStatus {
  if (squawk && ALERT_SQUAWKS.has(squawk)) return "alert";
  if (onGround) return "ground";
  if (verticalRate != null && verticalRate > PHASE_RATE_THRESHOLD) return "climb";
  if (verticalRate != null && verticalRate < -PHASE_RATE_THRESHOLD) return "descent";
  return "cruise";
}

function parseRow(row: StateRow): Aircraft | null {
  const longitude = row[5] as number | null;
  const latitude = row[6] as number | null;
  if (longitude == null || latitude == null) return null;

  const onGround = Boolean(row[8]);
  const verticalRate = row[11] as number | null;
  const squawk = (row[14] as string | null) ?? null;
  const callsign = typeof row[1] === "string" ? row[1].trim() : "";

  return {
    icao24: String(row[0]),
    callsign: callsign.length > 0 ? callsign : null,
    originCountry: String(row[2] ?? "Unknown"),
    lastContact: Number(row[4] ?? 0),
    longitude,
    latitude,
    baroAltitude: row[7] as number | null,
    geoAltitude: row[13] as number | null,
    onGround,
    velocity: row[9] as number | null,
    trueTrack: row[10] as number | null,
    verticalRate,
    squawk,
    category: row.length > 17 ? ((row[17] as number | null) ?? null) : null,
    status: deriveStatus(onGround, verticalRate, squawk),
    // OpenSky's live state vectors don't carry origin/destination.
    route: null,
  };
}

async function fetchFromUpstream(): Promise<TelemetrySnapshot> {
  const token = await getAccessToken();
  const res = await fetch(relayedUrl(STATES_URL), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });

  if (res.status === 429) {
    throw new OpenSkyError("OpenSky rate limit reached", true);
  }
  if (!res.ok) {
    throw new OpenSkyError(`OpenSky responded with ${res.status}`);
  }

  const remainingHeader = res.headers.get("x-rate-limit-remaining");
  const json = (await res.json()) as { time: number; states: StateRow[] | null };

  const aircraft: Aircraft[] = [];
  for (const row of json.states ?? []) {
    const parsed = parseRow(row);
    if (parsed) aircraft.push(parsed);
  }

  return {
    time: json.time,
    fetchedAt: Date.now(),
    aircraft,
    source: token ? "authenticated" : "anonymous",
    creditsRemaining: remainingHeader ? Number(remainingHeader) : null,
  };
}

const TRACK_URL = "https://opensky-network.org/api/tracks/all";
const TRACK_TTL_MS = 180_000;
const trackCache = new Map<string, { track: TrackPath; fetchedAt: number }>();

/**
 * Fetch the flight path (departure → latest waypoint) for one aircraft.
 * OpenSky's /tracks endpoint is experimental and can 404 or reject anonymous
 * callers — in that case we return an empty path and the client falls back
 * to its session-recorded trail.
 */
export async function fetchTrack(icao24: string): Promise<TrackPath> {
  // Force synthetic routes for demos / offline development.
  if (process.env.OPENSKY_USE_MOCK === "1") return generateMockTrack(icao24);

  const cached = trackCache.get(icao24);
  if (cached && Date.now() - cached.fetchedAt < TRACK_TTL_MS) {
    return cached.track;
  }

  let track: TrackPath = { icao24, path: [] };
  try {
    const token = await getAccessToken();
    const res = await fetch(relayedUrl(`${TRACK_URL}?icao24=${icao24}&time=0`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      const json = (await res.json()) as {
        path: [number, number | null, number | null, number | null, ...unknown[]][] | null;
      };
      const path: TrackPoint[] = [];
      for (const wp of json.path ?? []) {
        if (wp[1] == null || wp[2] == null) continue;
        path.push({
          time: wp[0],
          latitude: wp[1],
          longitude: wp[2],
          altitude: wp[3],
        });
      }
      track = { icao24, path };
    }
  } catch {
    // treat as "no track available"
  }

  trackCache.set(icao24, { track, fetchedAt: Date.now() });
  if (trackCache.size > 200) {
    const oldest = trackCache.keys().next().value;
    if (oldest) trackCache.delete(oldest);
  }
  return track;
}

/**
 * Fetch the current global state-vector snapshot, deduplicating concurrent
 * callers and reusing a snapshot for SNAPSHOT_TTL_MS so N browser tabs cost
 * one upstream request.
 */
export async function fetchTelemetrySnapshot(): Promise<TelemetrySnapshot> {
  // Force synthetic data for demos / offline development.
  if (process.env.OPENSKY_USE_MOCK === "1") return generateMockSnapshot();

  if (snapshotCache && Date.now() - snapshotCache.fetchedAt < SNAPSHOT_TTL_MS) {
    return snapshotCache;
  }
  if (!inflight) {
    inflight = fetchFromUpstream()
      .then((snapshot) => {
        snapshotCache = snapshot;
        return snapshot;
      })
      .catch((error) => {
        // Never blank the globe: reuse the last good snapshot if we have one,
        // otherwise fall back to synthetic data so the app stays usable when
        // the OpenSky quota is exhausted or upstream is down.
        if (snapshotCache) return snapshotCache;
        console.error("OpenSky unavailable, serving demo data:", error);
        return generateMockSnapshot();
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
