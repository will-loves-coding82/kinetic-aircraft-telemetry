"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import {
  CrosshairIcon,
  GaugeIcon,
  MoonIcon,
  PlaneIcon,
  KineticIcon,
  SunIcon,
  TargetIcon,
  TowerIcon,
} from "@/components/ui/icons";

const MockGlobe = dynamic(
  () => import("@/components/landing/MockGlobe").then((m) => m.MockGlobe),
  { ssr: false },
);

const FADE_UP = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={FADE_UP}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.6, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Uppercase, ultra-bold, tightly-tracked headline — the landing page's signature type. */
function Display({
  as: Tag = "h2",
  className = "",
  children,
}: {
  as?: "h1" | "h2" | "h3";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={`font-display font-semibold uppercase leading-[0.92] text-white ${className}`}
    >
      {children}
    </Tag>
  );
}

interface FeatureProps {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "right";
  children: React.ReactNode;
}

function Feature({ eyebrow, title, description, align = "left", children }: FeatureProps) {
  const flipped = align === "right";
  return (
    <div
      className={`mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 py-20 md:flex-row md:gap-16 md:py-28 ${
        flipped ? "md:flex-row-reverse" : ""
      }`}
    >
      <Reveal className="flex-1">
        <span className="font-display text-sm font-bold uppercase tracking-[0.3em] text-accent">
          {eyebrow}
        </span>
        <Display as="h3" className="mt-3 text-4xl md:text-5xl">
          {title}
        </Display>
        <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
          {description}
        </p>
      </Reveal>
      <Reveal delay={0.12} className="flex-1">
        <div className="relative w-full">{children}</div>
      </Reveal>
    </div>
  );
}

/**
 * Illustrative recreation of the details panel — not a screenshot, real
 * markup animated as a live demo: the status dot pulses, the Following
 * crosshair spins (as it does in the app), and a plane sweeps the route line.
 */
function DetailsMockup() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold tracking-wider text-white">
            UAL2492
          </div>
          <div className="text-[11px] text-white/40">A1B2C3 · United States</div>
        </div>
        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/70">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-[#3987e5]"
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          → Cruise
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent py-2 text-[12px] font-medium text-white">
          <TargetIcon width={13} height={13} /> Tracking
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-accent bg-accent/15 py-2 text-[12px] font-medium text-accent">
          <motion.span
            className="grid place-items-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <CrosshairIcon width={13} height={13} />
          </motion.span>
          Following
        </div>
      </div>

      {/* Route progress: plane sweeps SFO → JFK on a loop. */}
      {/* <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-base font-bold leading-none text-white">SFO</div>
            <div className="mt-1 text-[10px] text-white/40">San Francisco</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold leading-none text-white">JFK</div>
            <div className="mt-1 text-[10px] text-white/40">New York</div>
          </div>
        </div>
        <div className="relative mt-3 h-4">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
          <motion.div
            className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-accent"
            animate={{ width: ["4%", "96%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="absolute top-1/2 -translate-y-1/2 text-accent"
            animate={{ left: ["4%", "96%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          >
            <PlaneIcon width={13} height={13} className="rotate-90" />
          </motion.span>
        </div>
      </div> */}

      <div className="mt-4 divide-y divide-white/10 text-[12px]">
        {[
          ["Altitude", "11.3 km"],
          ["Heading", "284° WNW"],
          ["Ground speed", "891 km/h"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between py-1.5">
            <span className="text-white/40">{k}</span>
            <span className="font-medium tabular-nums text-white">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsMockup() {
  const bars = [18, 34, 52, 88, 61, 30];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
      <div className="grid grid-cols-2 gap-2">
        {[
          ["In view", "1,204"],
          ["Avg altitude", "9.4 km"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-white/10 px-3 py-2.5">
            <div className="text-[11px] text-white/40">{k}</div>
            <div className="mt-0.5 text-lg font-semibold text-white">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-20 items-end gap-1.5 border-b border-white/10 pb-0">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t bg-accent/80"
            initial={{ height: "2%" }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.8,
              delay: i * 0.08,
              ease: [0.2, 0.6, 0.2, 1],
            }}
          />
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {[
          ["United States", 62],
          ["Japan", 41],
          ["Germany", 27],
        ].map(([label, pct], i) => (
          <div key={label as string}>
            <div className="flex justify-between text-[11px] text-white/50">
              <span>{label}</span>
              <span className="tabular-nums text-white">{pct}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-accent/20">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: "0%" }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.9,
                  delay: 0.3 + i * 0.12,
                  ease: [0.2, 0.6, 0.2, 1],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusMockup() {
  const rows: [string, string, string][] = [
    ["#3987e5", "→", "Cruise"],
    ["#008300", "↗", "Climbing"],
    ["#c98500", "↘", "Descending"],
    ["#898781", "▾", "On ground"],
    ["#d03b3b", "⚠", "Alert squawk"],
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur">
      <ul className="space-y-1.5">
        {rows.map(([color, glyph, label], i) => (
          <motion.li
            key={label}
            className="flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px]"
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.09 }}
          >
            <motion.span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: color }}
              animate={
                label === "Alert squawk"
                  ? { opacity: [1, 0.3, 1], scale: [1, 1.25, 1] }
                  : undefined
              }
              transition={
                label === "Alert squawk"
                  ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
            />
            <span className="w-4 text-center text-white/40">{glyph}</span>
            <span className="text-white/70">{label}</span>
          </motion.li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-[12px] text-white/50">
        <TowerIcon width={14} height={14} />
        Airports rendered as distinct beacons, always visible
      </div>
    </div>
  );
}

/**
 * Full-bleed showcase: a real capture of the dashboard at 100% pitch —
 * traffic streaming over the curve of the earth. The image spans the whole
 * viewport width and blends into the page at its top and bottom edges.
 */
function HorizonShowcase() {
  return (
    <section className="relative py-20 md:py-28">
      <Reveal className="mx-auto max-w-6xl px-6">
        <Display as="h3" className="mt-3 text-4xl text-center md:text-5xl">
          Drop to the horizon
        </Display>
        <p className="mt-5 max-w-xl text-center mx-auto text-base leading-relaxed text-white/60">
          A pitch slider sweeps the camera from top-down orbit to a
          horizon-level view, follow a target, tilt down to its altitude, and
          watch live traffic stream over the curve of the earth.
        </p>
      </Reveal>
      <motion.div
        className="relative mt-10 md:mt-14"
        initial={{ opacity: 0, scale: 1.02 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.9, ease: [0.2, 0.6, 0.2, 1] }}
      >
        <Image
          src="/screenshots/horizon_showcase.png"
          alt="Kinetic dashboard at 100% pitch: live air traffic streaming over the horizon, with field-of-view stats alongside"
          width={3456}
          height={1728}
          className="w-full"
          sizes="100vw"
          quality={90}
        />
        {/* Blend the capture into the page at its top and bottom edges. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #07090c 0%, rgba(7,9,12,0) 14%, rgba(7,9,12,0) 86%, #07090c 100%)",
          }}
        />
      </motion.div>
    </section>
  );
}

/** The two themes take turns being "active", like a toggle on a loop. */
function ThemeMockup() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.div
        className="rounded-lg border border-white/10 bg-[#0d0d0d] p-4"
        animate={{ scale: [1, 1.04, 1, 1, 1], opacity: [1, 1, 1, 0.55, 1] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          times: [0, 0.1, 0.45, 0.6, 1],
        }}
      >
        <div className="mb-2 flex items-center gap-1.5 text-white/70">
          <MoonIcon width={13} height={13} />
          <span className="text-[11px] font-semibold">Dark</span>
        </div>
        <div className="h-16 rounded-md bg-[#11151b]" />
      </motion.div>
      <motion.div
        className="rounded-lg border border-white/10 bg-[#eaeef2] p-4"
        animate={{ scale: [1, 1, 1, 1.04, 1], opacity: [0.55, 0.55, 1, 1, 0.55] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          times: [0, 0.45, 0.5, 0.6, 1],
        }}
      >
        <div className="mb-2 flex items-center gap-1.5 text-black/60">
          <SunIcon width={13} height={13} />
          <span className="text-[11px] font-semibold">Light</span>
        </div>
        <div className="h-16 rounded-md bg-[#bcd0e6]" />
      </motion.div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="relative min-h-full overflow-x-hidden bg-[#07090c]">
      {/* Nav */}
      <div className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          {/* <RadarIcon width={20} height={20} /> */}
          <span className="font-display text-lg font-medium text-white">
            Kinetic
          </span>
        </Link>
        <Link
          href="/app"
          className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/10"
        >
          Dashboard
        </Link>
      </div>

      {/* Hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-y-0 right-[-15%] top-[-10%] h-[130%] w-[75%] opacity-90 md:right-[-5%] md:w-[60%]">
          <MockGlobe className="h-full w-full" />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #07090c 20%, rgba(7,9,12,0.75) 55%, rgba(7,9,12,0.15) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-28 pt-16 md:pb-40 md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.6, 0.2, 1] }}
          >
            <span className="flex justify-center items-center gap-2 font-display mx-auto tracking-[0.05em] font-medium text-accent">
              <KineticIcon width={14} height={14} />
              Live Airspace Intelligence
            </span>
            <Display as="h1" className="mt-5 max-w-4xl text-center mx-auto text-6xl md:text-8xl">
              Track the sky in real time
            </Display>
            <p className="mt-6 max-w-lg text-lg text-center mx-auto leading-relaxed text-white/60">
              Kinetic pulls live telemetry from thousands of aircraft onto an
              interactive 3D globe — pan, zoom, and rotate to find a target,
              click to inspect it, and follow it as it flies.
            </p>
            <div className="mt-9 flex flex-wrap justify-center items-center gap-4">
              <Link
                href="/app"
                className="rounded-md bg-accent px-6 py-3 text-sm font-medium uppercase tracking-wider text-white transition-transform active:scale-95"
              >
                Launch Dashboard
              </Link>
              <span className="flex items-center gap-1.5 text-[13px] text-white/40">
                <span className="h-2 w-2 animate-pulse rounded-full bg-good" />
                Live data via OpenSky Network
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <div className="relative z-10 border-t border-white/10">
        <Feature
          eyebrow=""
          title="Find any target, up close"
          description="Click an aircraft to expand its full telemetry — altitude, heading, speed, vertical rate. Toggle tracking to pin it to your watch list, or follow it with the camera as it crosses the globe."
        >
          <DetailsMockup />
        </Feature>

        <Feature
          eyebrow=""
          title="See what's overhead"
          align="right"
          description="Stats recompute live for whatever's on screen: altitude distribution, top origin countries, and status counts — zoom or rotate and the numbers follow."
        >
          <StatsMockup />
        </Feature>

        <Feature
          eyebrow=""
          title="Status at a glance"
          description="Cruise, climb, descent, ground, and alert squawks each get a reserved, colorblind-checked color — always paired with an icon and label, never color alone. Airports render as distinct beacons across the globe."
        >
          <StatusMockup />
        </Feature>

        <HorizonShowcase />
      </div>

      {/* CTA footer */}
      <section className="relative z-10 border-t border-white/10 px-6 py-24 text-center">
        <Reveal>
          <KineticIcon width={72} height={72} className="mx-auto my-8"/>
          <Display as="h2" className="text-4xl md:text-6xl">
            Ready for takeoff?
          </Display>
          <p className="mx-auto mt-4 max-w-md text-white/60">
            No signup. No setup. Just a live globe full of airplanes.
          </p>
          <Link
            href="/app"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-7 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-transform active:scale-95"
          >
            <PlaneIcon width={16} height={16} />
            Launch Dashboard
          </Link>
        </Reveal>
      </section>

      <footer className="relative z-10 flex items-center justify-between border-t border-white/10 px-6 py-6 text-[11px] text-white/30">
        <span>© {new Date().getFullYear()} Kinetic</span>
        <span className="flex items-center gap-1.5">
          <GaugeIcon width={12} height={12} />
          Data via the OpenSky Network
        </span>
      </footer>
    </div>
  );
}
