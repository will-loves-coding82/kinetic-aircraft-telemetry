/**
 * Core data models shared by the server (OpenSky ingestion) and the client
 * (globe, panels, charts).
 */

/** Flight phase derived from the raw state vector. Drives marker color. */
export type FlightStatus = "climb" | "cruise" | "descent" | "ground" | "alert";

/** A single aircraft state vector, normalized from OpenSky's array format. */
export interface Aircraft {
  /** Unique ICAO 24-bit transponder address (lowercase hex). */
  icao24: string;
  /** Callsign, trimmed; null when not broadcast. */
  callsign: string | null;
  originCountry: string;
  /** Unix seconds of the last position report. */
  lastContact: number;
  longitude: number;
  latitude: number;
  /** Barometric altitude in meters; null on ground / unknown. */
  baroAltitude: number | null;
  /** GNSS altitude in meters. */
  geoAltitude: number | null;
  onGround: boolean;
  /** Ground speed in m/s. */
  velocity: number | null;
  /** True track in decimal degrees, clockwise from north. */
  trueTrack: number | null;
  /** Vertical rate in m/s; positive = climbing. */
  verticalRate: number | null;
  squawk: string | null;
  /** ADS-B emitter category (0–20) when available. */
  category: number | null;
  status: FlightStatus;
  /**
   * Departure/arrival airports and schedule, when known. OpenSky's live state
   * vectors don't carry this (it would need a separate historical /flights
   * lookup keyed by icao24 + time window); populated for synthetic demo data.
   */
  route: FlightRoute | null;
}

/** Departure/arrival airports and schedule for one flight. */
export interface FlightRoute {
  origin: Airport;
  destination: Airport;
  /** Unix seconds. */
  departureTime: number;
  /** Unix seconds (estimated). */
  arrivalTime: number;
  /** 0 (at origin) → 1 (at destination) along the great-circle route. */
  progress: number;
}

/** One full fetch from OpenSky, as served to the client. */
export interface TelemetrySnapshot {
  /** Unix seconds the state vectors are valid for (from OpenSky). */
  time: number;
  /** Unix ms when our server fetched it. */
  fetchedAt: number;
  aircraft: Aircraft[];
  /**
   * How the snapshot was produced: OAuth2 credentials, the anonymous tier, or
   * synthetic demo data when OpenSky is unavailable.
   */
  source: "authenticated" | "anonymous" | "mock";
  /** Remaining API credits reported by OpenSky, when present. */
  creditsRemaining: number | null;
}

/** Error shape returned by /api/opensky/states on failure. */
export interface TelemetryError {
  error: string;
  /** True when the upstream rejected us for rate limiting (HTTP 429). */
  rateLimited: boolean;
}

/** A major airport / base rendered as a distinct icon on the globe. */
export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

/** A point of recorded telemetry history for a watched aircraft. */
export interface TelemetryPoint {
  /** Unix seconds. */
  t: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  velocity: number | null;
  verticalRate: number | null;
}

/** One waypoint of a flight path. */
export interface TrackPoint {
  /** Unix seconds. */
  time: number;
  latitude: number;
  longitude: number;
  /** Barometric altitude in meters; null when unknown. */
  altitude: number | null;
}

/** Flight path for one aircraft, from departure to the latest waypoint. */
export interface TrackPath {
  icao24: string;
  /** Empty when OpenSky has no track for this aircraft (or auth is missing). */
  path: TrackPoint[];
}

/** Aggregate stats over the aircraft currently inside the camera's FOV. */
export interface FovStats {
  inView: number;
  total: number;
  avgVelocity: number | null;
  avgAltitude: number | null;
  statusCounts: Record<FlightStatus, number>;
  /** Altitude histogram bins (km ranges). */
  altitudeBins: { label: string; count: number }[];
  /** Top origin countries among in-view aircraft. */
  topCountries: { label: string; count: number }[];
}
