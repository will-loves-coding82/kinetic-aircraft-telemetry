"use client";

import { useMemo } from "react";
import { useFovSnapshot } from "@/lib/fov-store";
import { ALTITUDE_BINS_KM } from "@/lib/altitude-bins";
import type { Aircraft, FlightStatus, FovStats } from "@/lib/types";

const EMPTY_STATUS_COUNTS: Record<FlightStatus, number> = {
  climb: 0,
  cruise: 0,
  descent: 0,
  ground: 0,
  alert: 0,
};

function altitudeOf(a: Aircraft): number | null {
  if (a.onGround) return 0;
  return a.baroAltitude ?? a.geoAltitude;
}

/**
 * Aggregate stats over the (filter-visible) aircraft currently in the
 * camera's FOV. Recomputes when data or the visible set changes (~2 Hz).
 */
export function useFovStats(aircraft: Aircraft[], total: number): FovStats {
  const fov = useFovSnapshot();

  return useMemo(() => {
    const visible = new Set(fov.ids);
    const inView = aircraft.filter((a) => visible.has(a.icao24));

    const statusCounts = { ...EMPTY_STATUS_COUNTS };
    const binCounts = ALTITUDE_BINS_KM.map(() => 0);
    const countryCounts = new Map<string, number>();
    let velocitySum = 0;
    let velocityN = 0;
    let altitudeSum = 0;
    let altitudeN = 0;

    for (const a of inView) {
      statusCounts[a.status] += 1;
      countryCounts.set(
        a.originCountry,
        (countryCounts.get(a.originCountry) ?? 0) + 1,
      );

      const alt = altitudeOf(a);
      if (alt != null) {
        const km = alt / 1000;
        const idx = ALTITUDE_BINS_KM.findIndex(
          (b) => km >= b.min && km < b.max,
        );
        if (idx >= 0) binCounts[idx] += 1;
        if (!a.onGround) {
          altitudeSum += alt;
          altitudeN += 1;
        }
      }
      if (!a.onGround && a.velocity != null) {
        velocitySum += a.velocity;
        velocityN += 1;
      }
    }

    const topCountries = [...countryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    return {
      inView: inView.length,
      total,
      avgVelocity: velocityN ? velocitySum / velocityN : null,
      avgAltitude: altitudeN ? altitudeSum / altitudeN : null,
      statusCounts,
      altitudeBins: ALTITUDE_BINS_KM.map((b, i) => ({
        label: b.label,
        count: binCounts[i],
      })),
      topCountries,
    };
  }, [aircraft, total, fov]);
}
