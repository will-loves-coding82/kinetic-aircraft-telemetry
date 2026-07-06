import { AIRPORTS } from "@/lib/airports";
import type {
  Aircraft,
  FlightStatus,
  TelemetrySnapshot,
  TrackPath,
  TrackPoint,
} from "@/lib/types";

/**
 * Deterministic synthetic telemetry, used when OpenSky is unavailable (daily
 * quota reached, no credentials, or upstream error) so the dashboard always
 * has a live-feeling swarm to render.
 *
 * Two populations:
 * - **Route flights**: great-circle routes between two real airports, advanced
 *   along their path by wall-clock time — positions drift between polls and
 *   headings, altitudes, and phases stay physically consistent.
 * - **Test clusters**: tight knots of aircraft loitering over fixed US cities,
 *   for exercising zoom-to-distinguish and the marker-scaling behavior.
 *
 * Both populations also expose a `generateMockTrack()` flight path so tracked
 * targets get a real dashed route without any network call.
 */

const FLIGHT_COUNT = 900;
/** Fixed epoch so the fleet is continuous across requests/instances. */
const EPOCH_MS = Date.UTC(2024, 0, 1);

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Deterministic PRNG (mulberry32) so the fleet is stable run to run. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AIRLINES = [
  { code: "UAL", country: "United States" },
  { code: "AAL", country: "United States" },
  { code: "DAL", country: "United States" },
  { code: "SWA", country: "United States" },
  { code: "JBU", country: "United States" },
  { code: "ACA", country: "Canada" },
  { code: "BAW", country: "United Kingdom" },
  { code: "VIR", country: "United Kingdom" },
  { code: "AFR", country: "France" },
  { code: "DLH", country: "Germany" },
  { code: "KLM", country: "Netherlands" },
  { code: "IBE", country: "Spain" },
  { code: "UAE", country: "United Arab Emirates" },
  { code: "QTR", country: "Qatar" },
  { code: "SIA", country: "Singapore" },
  { code: "ANA", country: "Japan" },
  { code: "JAL", country: "Japan" },
  { code: "CPA", country: "Hong Kong" },
  { code: "QFA", country: "Australia" },
  { code: "AIC", country: "India" },
];

// ---------------------------------------------------------------------------
// Spherical helpers
// ---------------------------------------------------------------------------

function toVec(latDeg: number, lonDeg: number): [number, number, number] {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  return [
    Math.cos(lat) * Math.cos(lon),
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
  ];
}

function toLatLon(v: [number, number, number]): [number, number] {
  return [Math.asin(v[2]) * RAD, Math.atan2(v[1], v[0]) * RAD];
}

function slerp(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  dot = Math.max(-1, Math.min(1, dot));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a;
  const sin = Math.sin(omega);
  const s0 = Math.sin((1 - t) * omega) / sin;
  const s1 = Math.sin(t * omega) / sin;
  return [a[0] * s0 + b[0] * s1, a[1] * s0 + b[1] * s1, a[2] * s0 + b[2] * s1];
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * DEG;
  const φ2 = lat2 * DEG;
  const Δλ = (lon2 - lon1) * DEG;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * RAD + 360) % 360;
}

function statusFor(onGround: boolean, verticalRate: number): FlightStatus {
  if (onGround) return "ground";
  if (verticalRate > 2) return "climb";
  if (verticalRate < -2) return "descent";
  return "cruise";
}

// ---------------------------------------------------------------------------
// Route flights
// ---------------------------------------------------------------------------

interface FlightPlan {
  icao24: string;
  callsign: string;
  originCountry: string;
  from: (typeof AIRPORTS)[number];
  to: (typeof AIRPORTS)[number];
  duration: number;
  offset: number;
  cruiseAltitude: number;
  cruiseSpeed: number;
  category: number;
}

let plansCache: FlightPlan[] | null = null;
let plansByIcao: Map<string, FlightPlan> | null = null;

function buildPlans(): FlightPlan[] {
  if (plansCache) return plansCache;
  const rand = mulberry32(0xa17c);
  const plans: FlightPlan[] = [];
  const byIcao = new Map<string, FlightPlan>();
  for (let i = 0; i < FLIGHT_COUNT; i++) {
    const from = AIRPORTS[Math.floor(rand() * AIRPORTS.length)];
    let to = AIRPORTS[Math.floor(rand() * AIRPORTS.length)];
    while (to === from) to = AIRPORTS[Math.floor(rand() * AIRPORTS.length)];
    const airline = AIRLINES[Math.floor(rand() * AIRLINES.length)];
    const icao24 = Math.floor(rand() * 0xffffff)
      .toString(16)
      .padStart(6, "0");
    const plan: FlightPlan = {
      icao24,
      callsign: `${airline.code}${100 + Math.floor(rand() * 8900)}`,
      originCountry: airline.country,
      from,
      to,
      duration: 3600 + rand() * 12 * 3600,
      offset: rand() * 24 * 3600,
      cruiseAltitude: 9500 + rand() * 3200,
      cruiseSpeed: 210 + rand() * 60,
      category: 3 + Math.floor(rand() * 4),
    };
    plans.push(plan);
    byIcao.set(icao24, plan);
  }
  plansCache = plans;
  plansByIcao = byIcao;
  return plans;
}

interface PlanState {
  latitude: number;
  longitude: number;
  trueTrack: number;
  altitude: number;
  verticalRate: number;
  onGround: boolean;
  velocity: number;
  progress: number;
}

function planStateAt(plan: FlightPlan, progress: number): PlanState {
  const a = toVec(plan.from.latitude, plan.from.longitude);
  const b = toVec(plan.to.latitude, plan.to.longitude);
  const pos = toLatLon(slerp(a, b, progress));
  const ahead = toLatLon(slerp(a, b, Math.min(progress + 0.001, 1)));
  const trueTrack = bearing(pos[0], pos[1], ahead[0], ahead[1]);

  let altitude: number;
  let verticalRate: number;
  if (progress < 0.1) {
    altitude = plan.cruiseAltitude * (progress / 0.1);
    verticalRate = 8 + Math.sin(progress * 40) * 2;
  } else if (progress > 0.9) {
    altitude = plan.cruiseAltitude * ((1 - progress) / 0.1);
    verticalRate = -7 - Math.sin(progress * 40) * 2;
  } else {
    altitude = plan.cruiseAltitude + Math.sin(progress * 30) * 60;
    verticalRate = Math.sin(progress * 30) * 0.6;
  }
  const onGround = progress < 0.004 || progress > 0.996;
  const velocity = onGround
    ? 10 + progress * 4000
    : plan.cruiseSpeed * (progress < 0.1 ? 0.6 + progress * 4 : 1);

  return {
    latitude: pos[0],
    longitude: pos[1],
    trueTrack,
    altitude,
    verticalRate,
    onGround,
    velocity,
    progress,
  };
}

function progressOf(plan: FlightPlan, elapsed: number): number {
  return (
    ((((elapsed + plan.offset) % plan.duration) + plan.duration) %
      plan.duration) /
    plan.duration
  );
}

/** Departure/arrival airports and schedule for a route flight at time `elapsed`. */
function routeFor(plan: FlightPlan, elapsed: number): Aircraft["route"] {
  const progress = progressOf(plan, elapsed);
  const departureTime = elapsed - progress * plan.duration + EPOCH_MS / 1000;
  return {
    origin: plan.from,
    destination: plan.to,
    departureTime: Math.round(departureTime),
    arrivalTime: Math.round(departureTime + plan.duration),
    progress,
  };
}

// ---------------------------------------------------------------------------
// Test clusters — tight knots loitering over fixed US cities
// ---------------------------------------------------------------------------

/** Cluster centers, deliberately in the same relative US area for zoom tests. */
const CLUSTER_CENTERS = [
  { lat: 40.7, lon: -74.0, tag: "N" }, // New York metro
  { lat: 41.9, lon: -87.6, tag: "C" }, // Chicago
  { lat: 34.05, lon: -118.24, tag: "L" }, // Los Angeles
];
const PER_CLUSTER = 26;
/** Tight spread so many markers overlap until you zoom in. */
const CLUSTER_SPREAD_DEG = 0.28;

interface ClusterCraft {
  icao24: string;
  callsign: string;
  originCountry: string;
  baseLat: number;
  baseLon: number;
  /** Loiter circle radius (degrees) and angular speed (rad/s). */
  loiterR: number;
  omega: number;
  phase: number;
  altitude: number;
  verticalRate: number;
  velocity: number;
  category: number;
}

let clusterCache: ClusterCraft[] | null = null;
let clusterByIcao: Map<string, ClusterCraft> | null = null;

function buildClusters(): ClusterCraft[] {
  if (clusterCache) return clusterCache;
  const rand = mulberry32(0x5c1a);
  const craft: ClusterCraft[] = [];
  const byIcao = new Map<string, ClusterCraft>();
  for (const center of CLUSTER_CENTERS) {
    for (let i = 0; i < PER_CLUSTER; i++) {
      const airline = AIRLINES[Math.floor(rand() * AIRLINES.length)];
      const icao24 = Math.floor(rand() * 0xffffff)
        .toString(16)
        .padStart(6, "0");
      const roll = rand();
      const verticalRate = roll < 0.2 ? 8 : roll < 0.4 ? -8 : 0.2;
      const c: ClusterCraft = {
        icao24,
        callsign: `${airline.code}${100 + Math.floor(rand() * 8900)}`,
        originCountry: airline.country,
        baseLat: center.lat + (rand() - 0.5) * CLUSTER_SPREAD_DEG,
        baseLon: center.lon + (rand() - 0.5) * CLUSTER_SPREAD_DEG,
        loiterR: 0.02 + rand() * 0.05,
        omega: (rand() < 0.5 ? 1 : -1) * (0.0006 + rand() * 0.0012),
        phase: rand() * Math.PI * 2,
        altitude: 1500 + rand() * 10500,
        verticalRate,
        velocity: 150 + rand() * 90,
        category: 3 + Math.floor(rand() * 4),
      };
      craft.push(c);
      byIcao.set(icao24, c);
    }
  }
  clusterCache = craft;
  clusterByIcao = byIcao;
  return craft;
}

function clusterPosition(
  c: ClusterCraft,
  elapsed: number,
): { latitude: number; longitude: number; trueTrack: number } {
  const ang = elapsed * c.omega + c.phase;
  const cosLat = Math.cos(c.baseLat * DEG) || 1e-3;
  const latitude = c.baseLat + c.loiterR * Math.sin(ang);
  const longitude = c.baseLon + (c.loiterR * Math.cos(ang)) / cosLat;
  // Heading = bearing of the velocity vector along the loiter circle.
  const dLat = c.loiterR * Math.cos(ang) * c.omega;
  const dLon = (-c.loiterR * Math.sin(ang) * c.omega) / cosLat;
  const trueTrack =
    (Math.atan2(dLon * Math.cos(latitude * DEG), dLat) * RAD + 360) % 360;
  return { latitude, longitude, trueTrack };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateMockSnapshot(): TelemetrySnapshot {
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const elapsed = (nowMs - EPOCH_MS) / 1000;
  const aircraft: Aircraft[] = [];

  for (const plan of buildPlans()) {
    const s = planStateAt(plan, progressOf(plan, elapsed));
    aircraft.push({
      icao24: plan.icao24,
      callsign: plan.callsign,
      originCountry: plan.originCountry,
      lastContact: nowSec - Math.floor(Math.random() * 8),
      longitude: s.longitude,
      latitude: s.latitude,
      baroAltitude: s.onGround ? 0 : Math.round(s.altitude),
      geoAltitude: s.onGround ? 0 : Math.round(s.altitude + 120),
      onGround: s.onGround,
      velocity: Math.round(s.velocity * 10) / 10,
      trueTrack: Math.round(s.trueTrack * 100) / 100,
      verticalRate: s.onGround ? 0 : Math.round(s.verticalRate * 10) / 10,
      squawk: null,
      category: plan.category,
      status: statusFor(s.onGround, s.onGround ? 0 : s.verticalRate),
      route: routeFor(plan, elapsed),
    });
  }

  for (const c of buildClusters()) {
    const p = clusterPosition(c, elapsed);
    aircraft.push({
      icao24: c.icao24,
      callsign: c.callsign,
      originCountry: c.originCountry,
      lastContact: nowSec - Math.floor(Math.random() * 8),
      longitude: p.longitude,
      latitude: p.latitude,
      baroAltitude: Math.round(c.altitude),
      geoAltitude: Math.round(c.altitude + 120),
      onGround: false,
      velocity: Math.round(c.velocity * 10) / 10,
      trueTrack: Math.round(p.trueTrack * 100) / 100,
      verticalRate: c.verticalRate,
      squawk: null,
      category: c.category,
      status: statusFor(false, c.verticalRate),
      // Cluster aircraft loiter over a city — no departure/arrival to report.
      route: null,
    });
  }

  return {
    time: nowSec,
    fetchedAt: nowMs,
    aircraft,
    source: "mock",
    creditsRemaining: null,
  };
}

/** A synthetic flight path for a mock aircraft (route flights and clusters). */
export function generateMockTrack(icao24: string): TrackPath {
  const nowMs = Date.now();
  const nowSec = Math.floor(nowMs / 1000);
  const elapsed = (nowMs - EPOCH_MS) / 1000;

  // Ensure the lookup maps are populated.
  buildPlans();
  buildClusters();

  const plan = plansByIcao?.get(icao24);
  if (plan) {
    const progress = progressOf(plan, elapsed);
    const a = toVec(plan.from.latitude, plan.from.longitude);
    const b = toVec(plan.to.latitude, plan.to.longitude);
    const steps = 48;
    const path: TrackPoint[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (progress * i) / steps;
      const [lat, lon] = toLatLon(slerp(a, b, t));
      const s = planStateAt(plan, t);
      path.push({
        time: Math.round(nowSec - (progress - t) * plan.duration),
        latitude: lat,
        longitude: lon,
        altitude: s.onGround ? 0 : Math.round(s.altitude),
      });
    }
    return { icao24, path };
  }

  const c = clusterByIcao?.get(icao24);
  if (c) {
    // Trace the loiter arc over the last ~15 minutes.
    const window = 900;
    const steps = 24;
    const path: TrackPoint[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = elapsed - window + (window * i) / steps;
      const p = clusterPosition(c, t);
      path.push({
        time: Math.round(nowSec - window + (window * i) / steps),
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: Math.round(c.altitude),
      });
    }
    return { icao24, path };
  }

  return { icao24, path: [] };
}
