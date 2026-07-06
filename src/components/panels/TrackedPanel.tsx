"use client";

import { AnimatePresence, motion } from "motion/react";
import { Panel, PanelHeading } from "@/components/ui/Panel";
import { CrosshairIcon, XIcon } from "@/components/ui/icons";
import { useTargets } from "@/context/TargetsContext";
import {
  formatAltitude,
  formatVelocity,
  STATUS_DOT_CLASS,
  STATUS_LABEL,
} from "@/lib/format";
import type { Aircraft } from "@/lib/types";

const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

/**
 * Tracked-targets list content: click to inspect, follow, or untrack.
 * Extracted so the mobile bottom sheet can reuse it without the desktop
 * `<Panel>` chrome (see Dashboard.tsx).
 */
export function TrackedPanelBody({ byId }: { byId: Map<string, Aircraft> }) {
  const {
    trackedIds,
    toggleTracked,
    select,
    selectedId,
    followedId,
    toggleFollowed,
  } = useTargets();

  return (
    <>
      <div className="flex items-baseline gap-1.5 px-1">
        <PanelHeading>Tracked targets</PanelHeading>
        <span className="text-[10px] tabular-nums text-mute">
          {trackedIds.length}
        </span>
      </div>
      {trackedIds.length === 0 ? (
        <p className="px-1 pb-1 pt-2 text-[11px] text-mute">
          Click an aircraft on the globe, then hit{" "}
          <span className="font-semibold text-ink-2">Track</span> to pin it
          here.
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          <AnimatePresence initial={false} mode="popLayout">
            {trackedIds.map((id) => {
              const aircraft = byId.get(id);
              const isSelected = id === selectedId;
              const isFollowed = id === followedId;
              return (
                <motion.li
                  key={id}
                  layout
                  initial={{ opacity: 0, x: 24, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.96 }}
                  transition={SPRING}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => select(id)}
                    onKeyDown={(e) => e.key === "Enter" && select(id)}
                    className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 transition-colors ${
                      isSelected
                        ? "border-accent/60 bg-accent/10"
                        : "border-line hover:bg-panel-2"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        aircraft
                          ? STATUS_DOT_CLASS[aircraft.status]
                          : "bg-ground"
                      }`}
                      title={aircraft ? STATUS_LABEL[aircraft.status] : "Signal lost"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">
                        {aircraft?.callsign ?? id.toUpperCase()}
                      </div>
                      <div className="truncate text-[10px] text-mute">
                        {aircraft
                          ? `${formatAltitude(
                              aircraft.baroAltitude ?? aircraft.geoAltitude,
                            )} · ${formatVelocity(aircraft.velocity)}`
                          : "signal lost"}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={isFollowed ? "Stop following" : "Follow with camera"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollowed(id);
                      }}
                      className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
                        isFollowed
                          ? "bg-accent/20 text-accent"
                          : "text-mute hover:bg-panel-2 hover:text-ink"
                      }`}
                    >
                      <CrosshairIcon width={13} height={13} />
                    </button>
                    <button
                      type="button"
                      aria-label="Stop tracking"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTracked(id);
                      }}
                      className="grid h-6 w-6 place-items-center rounded-md text-mute transition-colors hover:bg-panel-2 hover:text-alert"
                    >
                      <XIcon width={13} height={13} />
                    </button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}

/** Desktop-only floating panel wrapping TrackedPanelBody. Hidden on mobile —
 * see Dashboard.tsx for the mobile bottom sheet built from the body directly. */
export function TrackedPanel({ byId }: { byId: Map<string, Aircraft> }) {
  return (
    <Panel className="p-3">
      <TrackedPanelBody byId={byId} />
    </Panel>
  );
}
