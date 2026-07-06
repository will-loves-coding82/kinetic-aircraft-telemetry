# Kinetic — Live Flight Telemetry

Real-time aircraft telemetry dashboard on an interactive 3D globe, powered by
the [OpenSky Network](https://opensky-network.org/data/api). Zoom, pan, and
rotate to locate targets, click an aircraft to expand its telemetry, toggle
tracking, and let the camera follow a target around the planet.

<image src="public/screenshots/horizon_showcase.png"/>

## Features

- **3D globe** (three.js + react-three-fiber): wireframe continents, graticule,
  atmosphere rim glow; every airborne aircraft rendered in a single instanced
  draw call (~10k+ targets at 60fps).
- **Target interaction**: click to expand details, toggle **Track** to pin a
  target, toggle **Follow** to glide the camera with it.
- **Status colors** (CVD-validated, always paired with glyph + label):
  cruise = blue, climbing = green, descending = amber, on ground = gray,
  alert squawk (7500/7600/7700) = red. Airports render as distinct violet
  diamonds with hover tooltips.
- **FOV analytics**: stat tiles, altitude distribution, top origin countries,
  and status counts recomputed live for whatever is on screen.
- **Dark/light theme** with no first-paint flash; snappy spring animations via
  `motion` (Framer Motion).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4 — no third-party UI kits
- three / @react-three/fiber / @react-three/drei for the globe
- TanStack Query for client polling, caching, and request dedup
- Server-side data fetching: the first snapshot renders from a server
  component; the browser then polls `/api/opensky/states`, so OpenSky
  credentials never reach the client

## Setup

```bash
npm install
cp .env.example .env.local   # optional but recommended
npm run dev
```

### OpenSky credentials (optional)

The app works anonymously, but OpenSky's anonymous tier has a small daily
budget (~400 credits; a global snapshot costs 4). Create an API client at
opensky-network.org (Account → API client) and set in `.env.local`:

```
OPENSKY_CLIENT_ID=...
OPENSKY_CLIENT_SECRET=...
```

`.env*` is gitignored (except `.env.example`).

## Deploying to Vercel

1. Push this directory to a repo and import it in Vercel.
2. Add `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` as environment variables.
3. Deploy — no other configuration needed. The API route sets
   `s-maxage=12, stale-while-revalidate` so the CDN collapses concurrent
   viewers onto one upstream request per interval.

`vercel.json` pins serverless functions to `fra1` (Frankfurt). OpenSky's
servers are EU-hosted (Switzerland); without this, functions running in
Vercel's default US region can hit `undici`'s connect timeout reaching
`auth.opensky-network.org`, which silently falls back to synthetic demo data
(look for a `DEMO` badge next to the feed status, or an "OpenSky unavailable,
serving demo data" line in the function logs). Region changes only apply to
new deployments — redeploy after editing `vercel.json`.

## Project layout

```
src/
  app/              pages, layout, API route (server)
  lib/              types, OpenSky client, geo math, formatters, FOV store
  hooks/            useTelemetry (TanStack Query), useFovStats
  context/          ThemeContext, TargetsContext
  components/
    globe/          Canvas, Earth, aircraft/airport layers, camera rig
    panels/         stats, details, tracked-targets panels
    charts/         stat tile, column chart, bar list, sparkline
    ui/             panel primitives, icons
```
