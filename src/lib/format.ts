import type { FlightStatus } from "@/lib/types";

export function formatAltitude(meters: number | null): string {
  if (meters == null) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Ground speed: m/s → km/h. */
export function formatVelocity(mps: number | null): string {
  if (mps == null) return "—";
  return `${Math.round(mps * 3.6).toLocaleString()} km/h`;
}

export function formatVerticalRate(mps: number | null): string {
  if (mps == null) return "—";
  const sign = mps > 0 ? "+" : "";
  return `${sign}${mps.toFixed(1)} m/s`;
}

const CARDINALS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export function formatHeading(degrees: number | null): string {
  if (degrees == null) return "—";
  const idx = Math.round(((degrees % 360) + 360) % 360 / 22.5) % 16;
  return `${Math.round(degrees)}° ${CARDINALS[idx]}`;
}

export function formatCoords(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

export function formatAgo(unixSeconds: number, nowMs: number): string {
  const s = Math.max(0, Math.round(nowMs / 1000 - unixSeconds));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

/** Local clock time, e.g. "6:12 PM" — mirrors a boarding-pass departure time. */
export function formatClock(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Duration between two unix-second timestamps, e.g. "1 hr 36 min". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export const STATUS_LABEL: Record<FlightStatus, string> = {
  climb: "Climbing",
  cruise: "Cruise",
  descent: "Descending",
  ground: "On ground",
  alert: "Alert squawk",
};

/** Tailwind background classes for status dots (paired with a text label). */
export const STATUS_DOT_CLASS: Record<FlightStatus, string> = {
  climb: "bg-climb",
  cruise: "bg-cruise",
  descent: "bg-descent",
  ground: "bg-ground",
  alert: "bg-alert",
};

/** Icon glyphs for statuses so color never carries meaning alone. */
export const STATUS_GLYPH: Record<FlightStatus, string> = {
  climb: "↗",
  cruise: "→",
  descent: "↘",
  ground: "▾",
  alert: "⚠",
};

const CATEGORY_LABELS: Record<number, string> = {
  0: "Unknown",
  1: "Unknown",
  2: "Light aircraft",
  3: "Small aircraft",
  4: "Large aircraft",
  5: "High-vortex large",
  6: "Heavy aircraft",
  7: "High performance",
  8: "Rotorcraft",
  9: "Glider",
  10: "Lighter-than-air",
  11: "Parachutist",
  12: "Ultralight",
  14: "UAV",
  15: "Spacecraft",
  16: "Emergency vehicle",
  17: "Service vehicle",
  18: "Point obstacle",
  19: "Cluster obstacle",
  20: "Line obstacle",
};

export function categoryLabel(category: number | null): string {
  if (category == null) return "Unknown";
  return CATEGORY_LABELS[category] ?? "Unknown";
}
