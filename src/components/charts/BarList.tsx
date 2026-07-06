"use client";

import { motion } from "motion/react";

interface BarListProps {
  items: { label: string; count: number }[];
  /** Value shown when there is nothing to rank. */
  emptyText: string;
  /** When provided, rows become toggle buttons (used for filters). */
  onItemClick?: (label: string) => void;
  /** Labels currently isolated; empty set = nothing isolated (all shown). */
  activeLabels?: Set<string>;
}

const SPRING = { type: "spring", stiffness: 320, damping: 32 } as const;

/**
 * Horizontal bar list for ranked categories: label + thin single-hue bar on a
 * same-ramp track + right-aligned value in ink (text never wears data color).
 */
export function BarList({
  items,
  emptyText,
  onItemClick,
  activeLabels,
}: BarListProps) {
  if (items.length === 0) {
    return <div className="py-2 text-[11px] text-mute">{emptyText}</div>;
  }
  const max = Math.max(...items.map((i) => i.count), 1);
  const isolating = (activeLabels?.size ?? 0) > 0;

  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const active = activeLabels?.has(item.label) ?? false;
        const dim = isolating && !active;
        const row = (
          <>
            <div className="mb-0.5 flex items-baseline justify-between gap-2">
              <span
                className={`truncate text-[11px] ${
                  active ? "font-semibold text-ink" : "text-ink-2"
                }`}
              >
                {item.label}
              </span>
              <span className="text-[11px] font-medium tabular-nums text-ink">
                {item.count.toLocaleString()}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-accent-soft/40">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={false}
                animate={{ width: `${(item.count / max) * 100}%` }}
                transition={SPRING}
              />
            </div>
          </>
        );
        return (
          <li key={item.label} className={dim ? "opacity-40" : ""}>
            {onItemClick ? (
              <button
                type="button"
                onClick={() => onItemClick(item.label)}
                aria-pressed={active}
                className="block w-full rounded-md px-1 py-0.5 text-left transition-colors hover:bg-panel-2"
              >
                {row}
              </button>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
