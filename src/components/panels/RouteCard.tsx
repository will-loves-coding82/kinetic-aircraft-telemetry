"use client";

import { motion } from "motion/react";
import { PlaneIcon } from "@/components/ui/icons";
import { formatClock, formatDuration } from "@/lib/format";
import type { FlightRoute } from "@/lib/types";

const SPRING = { type: "spring", stiffness: 260, damping: 30 } as const;

/**
 * Boarding-pass style origin → destination card: airport codes flank a
 * progress line with a plane marker, cities/times sit underneath, and a
 * remaining-time caption sits below — mirroring familiar flight-tracker apps.
 *
 * OpenSky's live feed doesn't carry a route (only synthetic demo flights do),
 * so this only ever renders when `route` is non-null.
 */
export function RouteCard({ route }: { route: FlightRoute }) {
  const progress = Math.min(1, Math.max(0, route.progress));
  const remainingSeconds = (1 - progress) * (route.arrivalTime - route.departureTime);
  const landed = progress >= 1;

  return (
    <div className="mt-3 rounded-md border border-line bg-panel-2/60 p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-lg font-bold leading-none text-ink">
            {route.origin.iata}
          </div>
          <div className="mt-1 truncate text-[10px] text-mute">
            {route.origin.city}
          </div>
          <div className="mt-1.5 text-[10px] tabular-nums text-ink-2">
            {formatClock(route.departureTime)}
          </div>
        </div>

        <div className="mt-1.5 flex flex-1 flex-col items-center px-2">
          <div className="relative h-4 w-full">
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-grid" />
            <motion.div
              className="absolute top-1/2 h-px bg-accent"
              style={{ left: 0 }}
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={SPRING}
            />
            <motion.div
              className="absolute top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded-full bg-panel-2 text-accent"
              initial={false}
              animate={{ left: `calc(${progress * 100}% - 8px)` }}
              transition={SPRING}
            >
              <PlaneIcon width={11} height={11} className="rotate-90" />
            </motion.div>
          </div>
          <div className="mt-1.5 text-[9px] uppercase tracking-wider text-mute">
            {landed ? "Arrived" : `${formatDuration(remainingSeconds)} left`}
          </div>
        </div>

        <div className="min-w-0 text-right">
          <div className="text-lg font-bold leading-none text-ink">
            {route.destination.iata}
          </div>
          <div className="mt-1 truncate text-[10px] text-mute">
            {route.destination.city}
          </div>
          <div className="mt-1.5 text-[10px] tabular-nums text-ink-2">
            {formatClock(route.arrivalTime)}
          </div>
        </div>
      </div>
    </div>
  );
}
