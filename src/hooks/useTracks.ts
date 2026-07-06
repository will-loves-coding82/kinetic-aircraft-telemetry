"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { TrackPath } from "@/lib/types";

const TRACK_REFRESH_MS = 180_000;

async function fetchTrackPath(icao24: string): Promise<TrackPath> {
  const res = await fetch(`/api/opensky/track?icao24=${icao24}`);
  if (!res.ok) return { icao24, path: [] };
  return (await res.json()) as TrackPath;
}

/**
 * Flight paths for the tracked aircraft, one cached query per target.
 * OpenSky's track endpoint is best-effort; consumers fall back to the
 * session-recorded trail when a path comes back empty.
 */
export function useTracks(
  trackedIds: string[],
): Record<string, TrackPath | undefined> {
  const results = useQueries({
    queries: trackedIds.map((id) => ({
      queryKey: ["opensky", "track", id],
      queryFn: () => fetchTrackPath(id),
      staleTime: TRACK_REFRESH_MS,
      refetchInterval: TRACK_REFRESH_MS,
      refetchOnWindowFocus: false,
    })),
  });

  // useQueries returns a new array each render; key the memo on when the
  // underlying data actually changed instead.
  const updatedKey = results.map((r) => r.dataUpdatedAt).join("|");
  return useMemo(
    () =>
      Object.fromEntries(trackedIds.map((id, i) => [id, results[i]?.data])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updatedKey stands in for results
    [trackedIds, updatedKey],
  );
}
