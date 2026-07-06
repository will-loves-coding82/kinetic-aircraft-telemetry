import { NextRequest, NextResponse } from "next/server";
import { fetchTrack } from "@/lib/opensky";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Region pinned in vercel.json — see states/route.ts and vercel.json.

const ICAO24_RE = /^[0-9a-f]{6}$/;

/** Flight path for one aircraft: /api/opensky/track?icao24=abc123 */
export async function GET(request: NextRequest) {
  const icao24 = request.nextUrl.searchParams.get("icao24")?.toLowerCase() ?? "";
  if (!ICAO24_RE.test(icao24)) {
    return NextResponse.json(
      { error: "icao24 must be a 6-char hex transponder address" },
      { status: 400 },
    );
  }
  const track = await fetchTrack(icao24);
  return NextResponse.json(track, {
    headers: {
      "Cache-Control": "public, s-maxage=180, stale-while-revalidate=300",
    },
  });
}
