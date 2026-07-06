/**
 * Altitude histogram bins (km), shared by the FOV stats aggregation and the
 * dashboard's altitude-range filter so clicking a bar in the chart filters
 * the exact same range it displays.
 */
export const ALTITUDE_BINS_KM = [
  { label: "0–2", min: 0, max: 2 },
  { label: "2–4", min: 2, max: 4 },
  { label: "4–6", min: 4, max: 6 },
  { label: "6–8", min: 6, max: 8 },
  { label: "8–10", min: 8, max: 10 },
  { label: "10–12", min: 10, max: 12 },
  { label: "12+", min: 12, max: Infinity },
];