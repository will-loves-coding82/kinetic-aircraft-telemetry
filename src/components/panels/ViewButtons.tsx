"use client";

import { AnimatePresence, motion } from "motion/react";
import { MoonIcon, SunIcon, TargetIcon, TowerIcon } from "@/components/ui/icons";
import { useTheme } from "@/context/ThemeContext";
import { useFilters } from "@/context/FiltersContext";
import { useTargets } from "@/context/TargetsContext";

interface ButtonSpec {
  key: string;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
  title: string;
  activeClass: string;
  icon: React.ReactNode;
}

/**
 * Airports-only / tracked-only / theme toggle buttons — shared between the
 * desktop header (inline row, sharing one Panel) and the mobile floating
 * icon rail (stacked column, each its own frosted button — see `column`
 * below, which carries the Panel-style chrome directly rather than wrapping
 * each button in a separate Panel, which read as a box nested in a box).
 */
export function ViewButtons({
  layout,
  className = "",
}: {
  layout: "row" | "column";
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const { airportsOnly, toggleAirportsOnly, trackedOnly, toggleTrackedOnly } =
    useFilters();
  const { trackedIds, followedId } = useTargets();
  const hasWatchedTargets = trackedIds.length > 0 || followedId != null;

  const buttons: ButtonSpec[] = [
    {
      key: "airports",
      onClick: toggleAirportsOnly,
      active: airportsOnly,
      title: "Show only airports",
      activeClass: "border-airport/50 bg-airport/15 text-airport",
      icon: <TowerIcon width={16} height={16} />,
    },
    {
      key: "tracked",
      onClick: toggleTrackedOnly,
      active: trackedOnly,
      disabled: !trackedOnly && !hasWatchedTargets,
      title:
        hasWatchedTargets || trackedOnly
          ? "Show only tracked & followed aircraft"
          : "Track or follow an aircraft first",
      activeClass: "border-accent/50 bg-accent/15 text-accent",
      icon: <TargetIcon width={16} height={16} />,
    },
    {
      key: "theme",
      onClick: toggleTheme,
      active: false,
      title: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
      activeClass: "",
      icon: (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="grid place-items-center"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </motion.span>
        </AnimatePresence>
      ),
    },
  ];

  const rowButton = (b: ButtonSpec) => (
    <button
      key={b.key}
      type="button"
      onClick={b.onClick}
      aria-pressed={b.active}
      disabled={b.disabled}
      title={b.title}
      className={`grid h-8 w-8 place-items-center rounded-md border transition-colors ${
        b.active
          ? b.activeClass
          : "border-line text-ink-2 hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-2"
      }`}
    >
      {b.icon}
    </button>
  );

  // Carries the Panel-style frosted chrome directly on the button itself —
  // a single box, not a Panel wrapping a bordered button inside it.
  const columnButton = (b: ButtonSpec) => (
    <button
      key={b.key}
      type="button"
      onClick={b.onClick}
      aria-pressed={b.active}
      disabled={b.disabled}
      title={b.title}
      className={`pointer-events-auto grid h-10 w-10 place-items-center rounded-md border shadow-[0_10px_40px_-8px_rgba(0,0,0,0.28)] backdrop-blur-2xl backdrop-saturate-150 transition-colors ${
        b.active
          ? b.activeClass
          : "border-line bg-panel text-ink-2 hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-panel disabled:hover:text-ink-2"
      }`}
    >
      {b.icon}
    </button>
  );

  if (layout === "row") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {buttons.map(rowButton)}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {buttons.map(columnButton)}
    </div>
  );
}
