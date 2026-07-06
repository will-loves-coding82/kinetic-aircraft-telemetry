"use client";

import { motion } from "motion/react";
import { Panel } from "@/components/ui/Panel";

interface PitchControlProps {
  /** 0–1: orbit target eased from globe center toward the surface. */
  pitch: number;
  onChange: (pitch: number) => void;
}

/**
 * Camera pitch: slide right to sweep the camera down toward the local
 * horizon (side-on views of aircraft and airports); slide back to 0 for the
 * classic top-down globe orbit.
 */
export function PitchControl({ pitch, onChange }: PitchControlProps) {
  return (
    <motion.div
      className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.15 }}
    >
      <Panel className="flex items-center gap-3 px-4 py-2">
        <label
          htmlFor="camera-pitch"
          className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mute"
        >
          Pitch
        </label>
        <input
          id="camera-pitch"
          type="range"
          min={0}
          max={100}
          value={Math.round(pitch * 100)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="h-1 w-36 cursor-pointer accent-accent"
          aria-label="Camera pitch: 0% top-down, 100% horizon view"
          title="0% top-down · 100% horizon view"
        />
        <span className="w-8 text-right text-[11px] font-medium tabular-nums text-ink-2">
          {Math.round(pitch * 100)}%
        </span>
        {pitch > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="rounded-md border border-line px-2 py-0.5 text-[10px] font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            Reset
          </button>
        )}
      </Panel>
    </motion.div>
  );
}
