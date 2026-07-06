"use client";

import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/Sparkline";

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** Optional secondary line under the value. */
  sub?: string;
  /** Optional trend sparkline values. */
  trend?: number[];
}

/** Compact KPI tile: label, headline value, optional trend. */
export function StatTile({ label, value, sub, trend }: StatTileProps) {
  return (
    <div className="rounded-md border border-line bg-panel-2/60 px-3 py-2.5">
      <div className="text-[11px] leading-tight text-ink-2">{label}</div>
      <div className="mt-0.5 text-lg font-semibold leading-tight text-ink">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[10px] text-mute">{sub}</div>}
      {trend && <Sparkline values={trend} className="mt-1.5" />}
    </div>
  );
}
