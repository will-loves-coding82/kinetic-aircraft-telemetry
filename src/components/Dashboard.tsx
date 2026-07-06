"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Header } from "@/components/Header";
import { StatsPanel, StatsPanelBody } from "@/components/panels/StatsPanel";
import { DetailsPanel } from "@/components/panels/DetailsPanel";
import { TrackedPanel, TrackedPanelBody } from "@/components/panels/TrackedPanel";
import { PitchControl } from "@/components/panels/PitchControl";
import { ZoomControl } from "@/components/panels/ZoomControl";
import { ViewButtons } from "@/components/panels/ViewButtons";
import { Panel } from "@/components/ui/Panel";
import { FAB } from "@/components/ui/FAB";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { GaugeIcon, KineticIcon, TargetIcon } from "@/components/ui/icons";
import { useTargets } from "@/context/TargetsContext";
import { useFilters } from "@/context/FiltersContext";
import { useTelemetry } from "@/hooks/useTelemetry";
import { useTracks } from "@/hooks/useTracks";
import { ALTITUDE_BINS_KM } from "@/lib/altitude-bins";
import type { Aircraft, TelemetrySnapshot, TrackPoint } from "@/lib/types";

/** Mirrors useFovStats' altitudeOf: 0 on the ground, else the best-known altitude. */
function altitudeOf(a: Aircraft): number | null {
  if (a.onGround) return 0;
  return a.baroAltitude ?? a.geoAltitude;
}

// The globe is WebGL-only; skip SSR and show a placeholder while it loads.
const GlobeCanvas = dynamic(
  () =>
    import("@/components/globe/GlobeCanvas").then((mod) => mod.GlobeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center text-mute">
        <span className="text-xs tracking-widest">Initializing globe...</span>
      </div>
    ),
  },
);

/** Client shell of the app: live query, 3D globe, and dashboard panels. */
export function Dashboard({
  initialSnapshot,
}: {
  initialSnapshot: TelemetrySnapshot | null;
}) {
  const query = useTelemetry(initialSnapshot);
  const targets = useTargets();
  const filters = useFilters();
  const { ingest } = targets;
  const [pitch, setPitch] = useState(0);
  const [zoomRequest, setZoomRequest] = useState<{
    value: number;
    nonce: number;
  } | null>(null);
  // Starting slider position, before any drag — matches the globe's default
  // camera distance (see GlobeCanvas's initial `camera.position`, ~2.7 units,
  // versus MAX_DISTANCE 3.5) without actually issuing a zoom request.
  const [zoomValue, setZoomValue] = useState(0.4);
  // Mobile-only bottom sheets (see the FABs near the end of this component).
  const [fovSheetOpen, setFovSheetOpen] = useState(false);
  const [trackedSheetOpen, setTrackedSheetOpen] = useState(false);

  const snapshot = query.data;
  const aircraft = useMemo(() => snapshot?.aircraft ?? [], [snapshot]);
  const byId = useMemo(
    () => new Map<string, Aircraft>(aircraft.map((a) => [a.icao24, a])),
    [aircraft],
  );

  // Visibility filters — tracked/selected targets always stay visible.
  // Airports-only hides the entire swarm; tracked-only isolates the watched
  // set and bypasses the status/country/altitude filters entirely.
  const visibleAircraft = useMemo(() => {
    if (filters.airportsOnly) return [];
    const watched = new Set(targets.trackedIds);
    if (targets.selectedId) watched.add(targets.selectedId);
    if (targets.followedId) watched.add(targets.followedId);
    if (filters.trackedOnly) {
      return aircraft.filter((a) => watched.has(a.icao24));
    }
    const bin =
      filters.altitudeBinIndex != null
        ? ALTITUDE_BINS_KM[filters.altitudeBinIndex]
        : null;
    return aircraft.filter((a) => {
      if (watched.has(a.icao24)) return true;
      if (!filters.statuses.has(a.status)) return false;
      if (filters.countries.size > 0 && !filters.countries.has(a.originCountry)) {
        return false;
      }
      if (bin) {
        const alt = altitudeOf(a);
        if (alt == null) return false;
        const km = alt / 1000;
        if (km < bin.min || km >= bin.max) return false;
      }
      return true;
    });
  }, [
    aircraft,
    filters.airportsOnly,
    filters.trackedOnly,
    filters.statuses,
    filters.countries,
    filters.altitudeBinIndex,
    targets.trackedIds,
    targets.selectedId,
    targets.followedId,
  ]);

  // Record telemetry history for selected/tracked aircraft on every poll.
  useEffect(() => {
    if (snapshot) ingest(snapshot);
  }, [snapshot, ingest]);

  // Flight paths for tracked targets: OpenSky track, else session trail;
  // always extended to the live position.
  const tracks = useTracks(targets.trackedIds);
  const paths = useMemo(() => {
    const out: Record<string, TrackPoint[]> = {};
    if (filters.airportsOnly) return out;
    for (const id of targets.trackedIds) {
      const server = tracks[id]?.path ?? [];
      const points: TrackPoint[] =
        server.length >= 2
          ? [...server]
          : (targets.history[id] ?? []).map((p) => ({
              time: p.t,
              latitude: p.latitude,
              longitude: p.longitude,
              altitude: p.altitude,
            }));
      const live = byId.get(id);
      if (live) {
        points.push({
          time: live.lastContact,
          latitude: live.latitude,
          longitude: live.longitude,
          altitude: live.baroAltitude ?? live.geoAltitude,
        });
      }
      if (points.length >= 2) out[id] = points;
    }
    return out;
  }, [filters.airportsOnly, targets.trackedIds, tracks, targets.history, byId]);

  const selected = targets.selectedId ? byId.get(targets.selectedId) : undefined;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-page">
      <GlobeCanvas
        aircraft={visibleAircraft}
        selectedId={targets.selectedId}
        trackedIds={targets.trackedIds}
        followedId={targets.followedId}
        paths={paths}
        pitch={pitch}
        zoomRequest={zoomRequest}
        airportsOnly={filters.airportsOnly}
        onSelect={targets.select}
      />

      <Header
        snapshot={snapshot}
        error={query.error}
        dataUpdatedAt={query.dataUpdatedAt}
        isFetching={query.isFetching}
      />

      <StatsPanel aircraft={visibleAircraft} total={aircraft.length} />

      <PitchControl pitch={pitch} onChange={setPitch} />

      <ZoomControl
        zoom={zoomValue}
        onChange={(request) => {
          setZoomValue(request.value);
          setZoomRequest(request);
        }}
      />

      {/* top-56 clears the floating view-buttons rail above, shown up
          through the xl breakpoint; only at xl+ does the rail move inline
          into the header, freeing the panel to sit right under it. */}
      <div className="pointer-events-none absolute bottom-3 right-3 top-56 z-10 flex w-[calc(100%-1.5rem)] max-w-xs flex-col justify-start gap-3 xl:top-3">
        <AnimatePresence mode="popLayout">
          {targets.selectedId && (
            <DetailsPanel
              // Stable key: switching between already-selected targets should
              // update this panel in place, not exit/enter (which caused a
              // visible swap with the tracked-targets panel below it).
              key="details"
              id={targets.selectedId}
              aircraft={selected}
              history={targets.history[targets.selectedId] ?? []}
              tracked={targets.isTracked(targets.selectedId)}
              followed={targets.followedId === targets.selectedId}
              onToggleTracked={() => targets.toggleTracked(targets.selectedId!)}
              onToggleFollowed={() =>
                targets.toggleFollowed(targets.selectedId!)
              }
              onClose={() => targets.select(null)}
            />
          )}
        </AnimatePresence>
        {/* Wide desktop only — below xl, tracked targets live behind the
            FAB + bottom sheet near the end of this component. */}
        <motion.div
          layout
          className="pointer-events-none hidden xl:block"
          initial={{ x: 48, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.1 }}
        >
          <TrackedPanel byId={byId} />
        </motion.div>
      </div>

      {/* Below xl: airports-only / tracked-only / theme buttons as a
          floating vertical rail (only wide desktop keeps them inline in the
          header — see Header.tsx). The details panel is pushed down
          (top-56) below xl so it starts under this rail instead of
          overlapping it. */}
      <div className="pointer-events-none fixed right-3 top-[4.5rem] z-20 xl:hidden">
        <ViewButtons layout="column" className="pointer-events-auto" />
      </div>

      {/* Below xl: FOV stats and tracked targets, each behind a FAB that
          opens a bottom sheet — frees up screen space on anything narrower
          than a wide desktop window (wide desktop shows both as floating
          side panels instead). */}
      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-20 flex justify-between xl:hidden">
        <FAB label="Field of view" onClick={() => setFovSheetOpen(true)}>
          <GaugeIcon width={20} height={20} />
        </FAB>
        <FAB
          label="Tracked targets"
          onClick={() => setTrackedSheetOpen(true)}
          badge={targets.trackedIds.length}
        >
          <TargetIcon width={20} height={20} />
        </FAB>
      </div>

      <BottomSheet open={fovSheetOpen} onClose={() => setFovSheetOpen(false)}>
        <StatsPanelBody aircraft={visibleAircraft} total={aircraft.length} />
      </BottomSheet>

      <BottomSheet
        open={trackedSheetOpen}
        onClose={() => setTrackedSheetOpen(false)}
      >
        <TrackedPanelBody byId={byId} />
      </BottomSheet>

      <AnimatePresence>
        {!snapshot && (
          <motion.div
            className="absolute inset-0 z-30 grid place-items-center bg-page/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Panel className="flex flex-col items-center gap-3 px-8 py-6">
              {query.error ? (
                <>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-crit/15 text-crit">
                    <KineticIcon width={20} height={20} />
                  </span>
                  <p className="max-w-xs text-center text-sm text-ink-2">
                    {query.error.rateLimited
                      ? "OpenSky rate limit reached. Add API credentials in .env.local for a bigger quota, or try again shortly."
                      : `Couldn't reach the telemetry feed: ${query.error.message}`}
                  </p>
                  <button
                    type="button"
                    onClick={() => query.refetch()}
                    className="rounded-md bg-accent px-4 py-1.5 text-[12px] font-semibold text-white transition-transform active:scale-95"
                  >
                    Retry
                  </button>
                </>
              ) : (
                <>
                  <motion.span
                    className="text-accent"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <KineticIcon width={28} height={28} />
                  </motion.span>
                  <p className="text-xs tracking-[0.2em] text-ink-2">
                    ACQUIRING TELEMETRY…
                  </p>
                </>
              )}
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
