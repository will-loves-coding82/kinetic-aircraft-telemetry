"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TelemetryPoint, TelemetrySnapshot } from "@/lib/types";

/** Max telemetry points kept per watched aircraft (~30 min at 15s polls). */
const HISTORY_LIMIT = 120;

interface TargetsContextValue {
  /** Aircraft whose details panel is open. */
  selectedId: string | null;
  select: (id: string | null) => void;
  /** Aircraft the user chose to track (ordered by when tracking started). */
  trackedIds: string[];
  isTracked: (id: string) => boolean;
  toggleTracked: (id: string) => void;
  /** Aircraft the camera is following, if any. Must be one of trackedIds or selected. */
  followedId: string | null;
  toggleFollowed: (id: string) => void;
  /** Recorded telemetry for selected/tracked aircraft, per icao24. */
  history: Record<string, TelemetryPoint[]>;
  /** Feed each new snapshot in so history accumulates for watched targets. */
  ingest: (snapshot: TelemetrySnapshot) => void;
}

const TargetsContext = createContext<TargetsContextValue | null>(null);

export function TargetsProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trackedIds, setTrackedIds] = useState<string[]>([]);
  const [followedId, setFollowedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, TelemetryPoint[]>>({});

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const isTracked = useCallback(
    (id: string) => trackedIds.includes(id),
    [trackedIds],
  );

  const toggleTracked = useCallback((id: string) => {
    setTrackedIds((prev) => {
      if (prev.includes(id)) {
        // Stop following an aircraft that is no longer tracked.
        setFollowedId((f) => (f === id ? null : f));
        return prev.filter((t) => t !== id);
      }
      return [...prev, id];
    });
  }, []);

  const toggleFollowed = useCallback((id: string) => {
    setFollowedId((prev) => {
      const nowFollowing = prev !== id;
      // Following a target implies tracking it too, so it shows up in the
      // tracked-targets list and keeps its flight path/history.
      if (nowFollowing) {
        setTrackedIds((tracked) =>
          tracked.includes(id) ? tracked : [...tracked, id],
        );
      }
      return nowFollowing ? id : null;
    });
  }, []);

  const ingest = useCallback(
    (snapshot: TelemetrySnapshot) => {
      setHistory((prev) => {
        const watched = new Set(trackedIds);
        if (selectedId) watched.add(selectedId);
        if (watched.size === 0) return Object.keys(prev).length ? {} : prev;

        const next: Record<string, TelemetryPoint[]> = {};
        let changed = false;
        for (const aircraft of snapshot.aircraft) {
          if (!watched.has(aircraft.icao24)) continue;
          const existing = prev[aircraft.icao24] ?? [];
          const last = existing[existing.length - 1];
          if (last && last.t === aircraft.lastContact) {
            next[aircraft.icao24] = existing;
            continue;
          }
          next[aircraft.icao24] = [
            ...existing.slice(-(HISTORY_LIMIT - 1)),
            {
              t: aircraft.lastContact,
              latitude: aircraft.latitude,
              longitude: aircraft.longitude,
              altitude: aircraft.baroAltitude ?? aircraft.geoAltitude,
              velocity: aircraft.velocity,
              verticalRate: aircraft.verticalRate,
            },
          ];
          changed = true;
        }
        // Drop history for aircraft no longer watched or no longer in feed.
        if (Object.keys(next).length !== Object.keys(prev).length) changed = true;
        return changed ? next : prev;
      });
    },
    [trackedIds, selectedId],
  );

  const value = useMemo(
    () => ({
      selectedId,
      select,
      trackedIds,
      isTracked,
      toggleTracked,
      followedId,
      toggleFollowed,
      history,
      ingest,
    }),
    [
      selectedId,
      select,
      trackedIds,
      isTracked,
      toggleTracked,
      followedId,
      toggleFollowed,
      history,
      ingest,
    ],
  );

  return (
    <TargetsContext.Provider value={value}>{children}</TargetsContext.Provider>
  );
}

export function useTargets(): TargetsContextValue {
  const ctx = useContext(TargetsContext);
  if (!ctx) throw new Error("useTargets must be used within TargetsProvider");
  return ctx;
}
