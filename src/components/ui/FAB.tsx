"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface FABProps {
  onClick: () => void;
  label: string;
  children: ReactNode;
  /** Small numeric badge (e.g. tracked-target count), hidden when 0/undefined. */
  badge?: number;
}

/** Floating action button — frosted glass, matches the Panel surface. */
export function FAB({ onClick, label, children, badge }: FABProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className="pointer-events-auto relative grid h-[52px] w-[52px] place-items-center rounded-lg border border-line bg-panel text-ink-2 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150 transition-colors active:text-ink"
    >
      {children}
      {!!badge && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-md bg-accent px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </motion.button>
  );
}
