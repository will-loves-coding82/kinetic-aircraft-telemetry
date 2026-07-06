"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Panel, PanelHeading } from "@/components/ui/Panel";
import { StatTile } from "@/components/charts/StatTile";
import { ColumnChart } from "@/components/charts/ColumnChart";
import { BarList } from "@/components/charts/BarList";
import { useFovStats } from "@/hooks/useFovStats";
import { useTargets } from "@/context/TargetsContext";
import { useFilters } from "@/context/FiltersContext";
import {
  formatCompact,
  STATUS_DOT_CLASS,
  STATUS_GLYPH,
  STATUS_LABEL,
} from "@/lib/format";
import type { Aircraft, FlightStatus } from "@/lib/types";

const STATUS_ORDER: FlightStatus[] = [
  "cruise",
  "climb",
  "descent",
  "ground",
  "alert",
];

const TREND_LIMIT = 40;

interface StatsPanelProps {
  /** Filter-visible aircraft (what the globe is rendering). */
  aircraft: Aircraft[];
  /** Total aircraft worldwide, before filters. */
  total: number;
}

/**
 * Live FOV stats content: KPI tiles, altitude distribution, top countries,
 * and the status filter list. Extracted from the desktop-positioned
 * `StatsPanel` so the mobile bottom sheet can reuse the exact same content
 * without the floating-aside chrome (see Dashboard.tsx).
 */
export function StatsPanelBody({ aircraft, total }: StatsPanelProps) {
  const stats = useFovStats(aircraft, total);
  const { trackedIds } = useTargets();
  const filters = useFilters();

  // Rolling in-view count for the trend sparkline.
  const [trend, setTrend] = useState<number[]>([]);
  const lastCount = useRef<number | null>(null);
  useEffect(() => {
    if (lastCount.current === stats.inView) return;
    lastCount.current = stats.inView;
    setTrend((prev) => [...prev.slice(-(TREND_LIMIT - 1)), stats.inView]);
  }, [stats.inView]);

  // Countries listed = top in-view + any active filter countries not in the top.
  const countryItems = [
    ...stats.topCountries,
    ...[...filters.countries]
      .filter((c) => !stats.topCountries.some((t) => t.label === c))
      .map((label) => ({ label, count: 0 })),
  ];

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="mt-2">
          <PanelHeading>Field of view</PanelHeading>
          <p className="mt-0.5 text-[11px] text-mute">
            Stats for aircraft on the screen
          </p>
        </div>
        {filters.hasActiveFilters && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={filters.clearFilters}
            className="mt-4 shrink-0 rounded-md border border-accent/50 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/20"
          >
            Clear filters
          </motion.button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatTile
          label="In view"
          value={formatCompact(stats.inView)}
          trend={trend}
        />
        <StatTile
          label="Tracked"
          value={trackedIds.length}
          sub={`of ${formatCompact(stats.total)} worldwide`}
        />
        <StatTile
          label="Avg speed"
          value={
            stats.avgVelocity != null
              ? `${Math.round(stats.avgVelocity * 3.6)}`
              : "—"
          }
          sub="km/h · airborne"
        />
        <StatTile
          label="Avg altitude"
          value={
            stats.avgAltitude != null
              ? (stats.avgAltitude / 1000).toFixed(1)
              : "—"
          }
          sub="km · airborne"
        />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <PanelHeading>Altitude distribution</PanelHeading>
          <span className="text-[9px] text-mute">click to isolate</span>
        </div>
        <div className="mt-2">
          <ColumnChart
            data={stats.altitudeBins}
            unit="aircraft"
            unitSuffix="km"
            activeIndex={filters.altitudeBinIndex}
            onSelect={filters.toggleAltitudeBin}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <PanelHeading>Top origin countries</PanelHeading>
          <span className="text-[9px] text-mute">click to isolate</span>
        </div>
        <div className="mt-2">
          <BarList
            items={countryItems}
            emptyText="No aircraft in view — zoom or rotate the globe."
            activeLabels={filters.countries}
            onItemClick={(label) => filters.toggleCountry(label)}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <PanelHeading>Flight status</PanelHeading>
          <span className="text-[9px] text-mute">click to show/hide</span>
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-1">
          {STATUS_ORDER.map((status) => {
            const enabled = filters.statuses.has(status);
            return (
              <li key={status}>
                <button
                  type="button"
                  onClick={() => filters.toggleStatus(status)}
                  aria-pressed={enabled}
                  className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px] transition-all hover:bg-panel-2 ${
                    enabled ? "" : "opacity-40"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT_CLASS[status]} ${
                      enabled ? "" : "opacity-40"
                    }`}
                  />
                  <span className="w-3 text-center text-mute">
                    {STATUS_GLYPH[status]}
                  </span>
                  <span
                    className={`text-ink-2 ${enabled ? "" : "line-through"}`}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="ml-auto font-medium tabular-nums text-ink">
                    {stats.statusCounts[status].toLocaleString()}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

/** Desktop-only floating panel: same content as StatsPanelBody, positioned
 * top-left. Hidden on mobile — see Dashboard.tsx for the mobile bottom sheet
 * built from StatsPanelBody directly. */
export function StatsPanel(props: StatsPanelProps) {
  return (
    <motion.aside
      className="pointer-events-none absolute bottom-3 left-3 top-3 z-10 hidden w-72 xl:block"
      initial={{ x: -32, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 28, delay: 0.05 }}
    >
      <Panel className="scroll-thin flex max-h-full flex-col gap-0 overflow-y-auto p-4">
        <StatsPanelBody {...props} />
      </Panel>
    </motion.aside>
  );
}
