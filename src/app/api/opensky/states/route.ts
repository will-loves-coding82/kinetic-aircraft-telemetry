import { NextResponse } from "next/server";
import { fetchTelemetrySnapshot, OpenSkyError } from "@/lib/opensky";
import type { TelemetryError } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxy for OpenSky state vectors. Keeps credentials server-side and lets
 * Vercel's CDN collapse concurrent clients onto one upstream request.
 */
export async function GET() {
  try {
    const snapshot = await fetchTelemetrySnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=12, stale-while-revalidate=48",
      },
    });
  } catch (error) {
    const rateLimited = error instanceof OpenSkyError && error.rateLimited;
    const body: TelemetryError = {
      error:
        error instanceof Error ? error.message : "Failed to reach OpenSky",
      rateLimited,
    };
    return NextResponse.json(body, { status: rateLimited ? 429 : 502 });
  }
}
