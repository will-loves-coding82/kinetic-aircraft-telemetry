"use client";

import { useState } from "react";
import { motion } from "motion/react";

interface ColumnChartProps {
  data: { label: string; count: number }[];
  /** Tooltip noun, e.g. "aircraft". */
  unit: string;
  /** X-axis meaning appended to tooltip labels, e.g. "km". */
  unitSuffix?: string;
  /** When provided, columns become click-to-filter toggle buttons. */
  onSelect?: (index: number) => void;
  /** Index of the currently-selected column; null/undefined = none selected. */
  activeIndex?: number | null;
}

const SPRING = { type: "spring", stiffness: 320, damping: 30 } as const;

/**
 * Single-hue column chart (magnitude → sequential accent). Rounded data-ends,
 * square baseline, hairline mid-gridline, hover tooltip per column, and a
 * direct label on the tallest column only. Optionally clickable: selecting a
 * column isolates it (used to filter the globe by altitude range).
 */
export function ColumnChart({
  data,
  unit,
  unitSuffix = "",
  onSelect,
  activeIndex,
}: ColumnChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.count), 1);
  const maxIndex = data.findIndex((d) => d.count === max);
  const hasSelection = activeIndex != null;

  return (
    <div className="relative">
      <div className="relative h-24 border-b border-grid">
        {/* hairline mid gridline */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-grid opacity-60" />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d, i) => {
            const isActive = activeIndex === i;
            const dimmed = hasSelection ? !isActive : hovered !== null && hovered !== i;
            const Wrapper = onSelect ? "button" : "div";
            return (
              <Wrapper
                key={d.label}
                type={onSelect ? "button" : undefined}
                aria-pressed={onSelect ? isActive : undefined}
                onClick={onSelect ? () => onSelect(i) : undefined}
                className={`relative flex h-full flex-1 items-end justify-center sm:max-w-10 ${
                  onSelect ? "cursor-pointer" : "cursor-default"
                }`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              >
                {/* cap at 86% so the direct label on the tallest column keeps headroom */}
                <motion.div
                  className="w-full rounded-t bg-accent"
                  initial={false}
                  animate={{
                    height: `${(d.count / max) * 86}%`,
                    opacity: dimmed ? 0.35 : 1,
                  }}
                  transition={SPRING}
                />
                {isActive && (
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 bottom-0 rounded-t border-2 border-ink/70"
                    initial={false}
                    animate={{ height: `${(d.count / max) * 86}%` }}
                    transition={SPRING}
                  />
                )}
                {i === maxIndex && d.count > 0 && hovered === null && !hasSelection && (
                  <div
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[9px] font-medium text-ink-2"
                    style={{ bottom: `calc(${(d.count / max) * 86}% + 2px)` }}
                  >
                    {d.count.toLocaleString()}
                  </div>
                )}
              </Wrapper>
            );
          })}
        </div>
        {hovered !== null && (
          <div
            className="pointer-events-none absolute -top-7 z-10 whitespace-nowrap rounded-md border border-line bg-panel-solid px-2 py-0.5 text-[10px] text-ink shadow-md"
            style={{
              left: `${((hovered + 0.5) / data.length) * 100}%`,
              // Centered by default; pinned to the near edge instead of the
              // midpoint for the first/last couple of bars, so it never
              // overflows past the chart's own bounds.
              transform:
                hovered === 0
                  ? "translateX(0)"
                  : hovered === data.length - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            {data[hovered].label}
            {unitSuffix && ` ${unitSuffix}`} ·{" "}
            <span className="font-semibold">
              {data[hovered].count.toLocaleString()}
            </span>{" "}
            {unit}
          </div>
        )}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {data.map((d, i) => (
          <div
            key={d.label}
            className={`flex-1 text-center text-[8.5px] sm:max-w-10 ${
              activeIndex === i ? "font-semibold text-ink" : "text-mute"
            }`}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
