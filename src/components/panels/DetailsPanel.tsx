"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Panel } from "@/components/ui/Panel";
import { RouteCard } from "@/components/panels/RouteCard";
import { Sparkline } from "@/components/charts/Sparkline";
import {
  ChevronDownIcon,
  CrosshairIcon,
  TargetIcon,
  XIcon,
} from "@/components/ui/icons";
import {
  categoryLabel,
  formatAgo,
  formatAltitude,
  formatCoords,
  formatHeading,
  formatVelocity,
  formatVerticalRate,
  STATUS_DOT_CLASS,
  STATUS_GLYPH,
  STATUS_LABEL,
} from "@/lib/format";
import type { Aircraft, TelemetryPoint } from "@/lib/types";

const SPRING = { type: "spring", stiffness: 340, damping: 30 } as const;

interface DetailsPanelProps {
  id: string;
  /** Undefined when the aircraft dropped out of the live feed. */
  aircraft: Aircraft | undefined;
  history: TelemetryPoint[];
  tracked: boolean;
  followed: boolean;
  onToggleTracked: () => void;
  onToggleFollowed: () => void;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[11px] text-mute">{label}</span>
      <span className="text-right text-[12px] font-medium tabular-nums text-ink">
        {children}
      </span>
    </div>
  );
}

/** Expanded details for the selected target, with track & follow toggles. */
export function DetailsPanel({
  id,
  aircraft,
  history,
  tracked,
  followed,
  onToggleTracked,
  onToggleFollowed,
  onClose,
}: DetailsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  // The panel now stays mounted across target switches (see Dashboard.tsx).
  // Collapse "More details" when the selected target changes by resetting
  // state during render (React's documented pattern), instead of an effect.
  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setExpanded(false);
  }
  // Ticking clock so "last contact" stays fresh between polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);
  const altitudes = history
    .map((p) => p.altitude)
    .filter((a): a is number => a != null);

  return (
    <motion.div
      layout
      initial={{ x: 48, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 48, opacity: 0 }}
      transition={SPRING}
      className="pointer-events-none"
    >
      <Panel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-medium tracking-wider">
                {aircraft?.callsign ?? "NO CALLSIGN"}
              </h2>
              {aircraft && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-panel-2/70 px-2 py-0.5 text-[10px] font-medium text-ink-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASS[aircraft.status]}`}
                  />
                  {STATUS_GLYPH[aircraft.status]} {STATUS_LABEL[aircraft.status]}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-mute">
              <span className="font-mono uppercase">{id}</span>
              {aircraft && ` · ${aircraft.originCountry}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-mute transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <XIcon width={14} height={14} />
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onToggleTracked}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              tracked
                ? "border-transparent bg-accent text-white"
                : "border-line text-ink-2 hover:bg-panel-2 hover:text-ink"
            }`}
          >
            <TargetIcon width={14} height={14} />
            {tracked ? "Tracking" : "Track"}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onToggleFollowed}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              followed
                ? "border-accent bg-accent/15 text-accent"
                : "border-line text-ink-2 hover:bg-panel-2 hover:text-ink"
            }`}
          >
            <motion.span
              animate={followed ? { rotate: 360 } : { rotate: 0 }}
              transition={
                followed
                  ? { duration: 4, repeat: Infinity, ease: "linear" }
                  : { duration: 0.2 }
              }
              className="grid place-items-center"
            >
              <CrosshairIcon width={14} height={14} />
            </motion.span>
            {followed ? "Following" : "Follow"}
          </motion.button>
        </div>

        {aircraft ? (
          <>
            {/* {aircraft.route && <RouteCard route={aircraft.route} />} */}

            <div className="mt-3 divide-y divide-line/60">
              <Row label="Altitude">
                {formatAltitude(aircraft.baroAltitude ?? aircraft.geoAltitude)}
              </Row>
              <Row label="Heading">{formatHeading(aircraft.trueTrack)}</Row>
              <Row label="Ground speed">{formatVelocity(aircraft.velocity)}</Row>
              <Row label="Vertical rate">
                {formatVerticalRate(aircraft.verticalRate)}
              </Row>
            </div>

            {altitudes.length >= 2 && (
              <div className="mt-2">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-mute">
                  Altitude · session history
                </div>
                <Sparkline values={altitudes} />
              </div>
            )}

            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-3 flex w-full items-center justify-between rounded-md border border-line px-3 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
              aria-expanded={expanded}
            >
              More details
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={SPRING}
                className="grid place-items-center"
              >
                <ChevronDownIcon width={14} height={14} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-2">
                    <Row label="Position">
                      {formatCoords(aircraft.latitude, aircraft.longitude)}
                    </Row>
                    <Row label="Squawk">{aircraft.squawk ?? "—"}</Row>
                    <Row label="Category">
                      {categoryLabel(aircraft.category)}
                    </Row>
                    <Row label="On ground">
                      {aircraft.onGround ? "Yes" : "No"}
                    </Row>
                    <Row label="Last contact">
                      {formatAgo(aircraft.lastContact, now)}
                    </Row>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <p className="mt-3 rounded-md border border-line bg-panel-2/60 px-3 py-2 text-[11px] text-ink-2">
            Signal lost — this aircraft dropped out of the live feed. It will
            reappear here if its transponder returns.
          </p>
        )}
      </Panel>
    </motion.div>
  );
}
