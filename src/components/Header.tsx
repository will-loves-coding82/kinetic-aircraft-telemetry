"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Panel } from "@/components/ui/Panel";
import { KineticIcon } from "@/components/ui/icons";
import { ViewButtons } from "@/components/panels/ViewButtons";
import { formatCompact } from "@/lib/format";
import { POLL_INTERVAL_MS, type TelemetryFetchError } from "@/hooks/useTelemetry";
import type { TelemetrySnapshot } from "@/lib/types";

type FeedState = "live" | "degraded" | "offline";

const FEED_META: Record<FeedState, { label: string; dotClass: string }> = {
  live: { label: "Live", dotClass: "bg-good" },
  degraded: { label: "Stale feed", dotClass: "bg-warn" },
  offline: { label: "Feed offline", dotClass: "bg-crit" },
};

interface HeaderProps {
  snapshot: TelemetrySnapshot | undefined;
  error: TelemetryFetchError | null;
  /** ms timestamp of the last successful fetch (TanStack dataUpdatedAt). */
  dataUpdatedAt: number;
  isFetching: boolean;
}

/** Small ring that depletes as the next poll approaches; spins while fetching. */
function FetchCountdown({
  dataUpdatedAt,
  isFetching,
}: {
  dataUpdatedAt: number;
  isFetching: boolean;
}) {
  // Seed with dataUpdatedAt (elapsed = 0) so server and client render the
  // identical markup on first paint — Date.now() would differ between the
  // SSR pass and client hydration, causing a hydration mismatch on the ring's
  // strokeDashoffset. The effect below switches to real wall-clock time right
  // after mount, which is allowed to diverge from the SSR output.
  const [now, setNow] = useState(dataUpdatedAt);
  useEffect(() => {
    // One-time sync to the real clock post-hydration — see comment above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const elapsed = now - dataUpdatedAt;
  const remainingMs = Math.max(0, POLL_INTERVAL_MS - elapsed);
  const seconds = Math.ceil(remainingMs / 1000);
  const fraction = Math.min(1, Math.max(0, remainingMs / POLL_INTERVAL_MS));

  const r = 8;
  const circumference = 2 * Math.PI * r;

  return (
    <span
      className="flex items-center gap-1.5 text-[11px] tabular-nums text-ink-2"
      title="Time until the next telemetry refresh"
    >
      <motion.svg
        width={20}
        height={20}
        viewBox="0 0 20 20"
        animate={isFetching ? { rotate: 360 } : { rotate: 0 }}
        transition={
          isFetching
            ? { duration: 1, repeat: Infinity, ease: "linear" }
            : { duration: 0 }
        }
      >
        <circle
          cx={10}
          cy={10}
          r={r}
          fill="none"
          stroke="var(--grid)"
          strokeWidth={2}
        />
        <circle
          cx={10}
          cy={10}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          transform="rotate(-90 10 10)"
          style={{ transition: "stroke-dashoffset 0.5s linear" }}
        />
      </motion.svg>
      <span>{isFetching ? "updating" : `next ${seconds}s`}</span>
    </span>
  );
}

/** Top bar: brand, feed health, fleet count, refresh timer, view + theme toggles. */
export function Header({
  snapshot,
  error,
  dataUpdatedAt,
  isFetching,
}: HeaderProps) {
  // Seeded from dataUpdatedAt (see FetchCountdown above) rather than
  // Date.now(), for the same SSR/hydration-consistency reason.
  const [now, setNow] = useState(dataUpdatedAt);

  useEffect(() => {
    // One-time sync to the real clock post-hydration — see comment above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(timer);
  }, []);

  let feed: FeedState = "live";
  if (!snapshot) feed = error ? "offline" : "degraded";
  else if (error || now - snapshot.fetchedAt > 60_000) feed = "degraded";
  const meta = FEED_META[feed];

  return (
    <motion.header
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center md:inset-x-3 md:top-3"
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <Panel className="flex w-full items-center gap-3 !rounded-none !rounded-b-lg px-4 py-2 md:w-auto md:!rounded-lg">
        <Link href="/" className="pointer-events-auto flex items-center gap-2">
          <KineticIcon width={16} height={16} />
          <p className="font-display text-lg font-medium">
            Kinetic
          </p>
        </Link>

        <span className="h-5 w-px bg-line" />

        <span
          className="flex items-center gap-1.5 text-[11px] font-medium text-ink-2"
          title={error?.message}
        >
          <motion.span
            className={`h-2 w-2 rounded-full ${meta.dotClass}`}
            animate={feed === "live" ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
            transition={
              feed === "live"
                ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                : undefined
            }
          />
          {meta.label}
          {error?.rateLimited && " · limited"}
        </span>

        <div className="hidden items-center gap-1 text-[11px] text-ink-2 sm:flex">
          <span className="font-semibold text-ink">
            {snapshot ? formatCompact(snapshot.aircraft.length) : "—"}
          </span>
          aircraft
        </div>

        {snapshot?.source === "mock" && (
          <span
            className="rounded-md border border-warn/50 bg-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn"
            title="OpenSky unavailable — showing synthetic demo traffic"
          >
            demo
          </span>
        )}

        {snapshot && (
          <>
            <span className="h-5 w-px bg-line" />
            <FetchCountdown
              dataUpdatedAt={dataUpdatedAt}
              isFetching={isFetching}
            />
          </>
        )}

        {/* Airports-only / tracked-only / theme buttons: inline here only on
            wide desktop; below xl they move to a floating vertical rail (see
            Dashboard.tsx) so this bar stays compact. */}
        <div className="ml-auto hidden items-center gap-3 xl:flex">
          <span className="h-5 w-px bg-line" />
          <ViewButtons layout="row" />
        </div>
      </Panel>
    </motion.header>
  );
}
