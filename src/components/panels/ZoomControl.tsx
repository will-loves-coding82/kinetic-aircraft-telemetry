"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { Panel } from "@/components/ui/Panel";

interface ZoomControlProps {
  /** 0 = zoomed all the way in, 1 = zoomed all the way out. */
  zoom: number;
  onChange: (request: { value: number; nonce: number }) => void;
}

const STEP = 0.05;

/**
 * Vertical zoom slider, floating on the right edge of the globe. Top = zoomed
 * in, bottom = zoomed out (matching the usual "up to zoom in" convention).
 * Each input fires with a fresh nonce (see CameraRig's zoomRequest prop) so
 * the camera rig can distinguish "slider moved again" from "slider idle,
 * let wheel/pinch drive zoom instead" even when the mapped value repeats.
 */
export function ZoomControl({ zoom, onChange }: ZoomControlProps) {
  const nonce = useRef(0);

  const commit = (value: number) => {
    nonce.current += 1;
    onChange({ value: Math.min(1, Math.max(0, value)), nonce: nonce.current });
  };

  return (
    <motion.div
      className="pointer-events-none absolute bottom-24 right-3 top-1/2 z-10 hidden -translate-y-1/2 sm:block xl:top-24 xl:translate-y-0"
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28, delay: 0.15 }}
    >
      <Panel className="flex h-full flex-col items-center gap-2 px-2 py-3">
        <button
          type="button"
          onClick={() => commit(zoom - STEP)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-sm font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <input
          id="camera-zoom"
          type="range"
          min={0}
          max={100}
          step={5}
          // Inverted: slider track shows 0 (in) at the top, so the raw
          // input value (which increases downward) needs flipping.
          value={Math.round((1 - zoom) * 100)}
          onChange={(e) => commit(1 - Number(e.target.value) / 100)}
          className="h-32 w-1 shrink-0 cursor-pointer appearance-none rounded-full bg-line accent-accent [writing-mode:vertical-lr]"
          style={{ direction: "rtl" }}
          aria-label="Camera zoom: top zoomed in, bottom zoomed out"
          title="Drag to zoom"
        />
        <button
          type="button"
          onClick={() => commit(zoom + STEP)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-sm font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>
      </Panel>
    </motion.div>
  );
}
