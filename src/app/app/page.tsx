import { Dashboard } from "@/components/Dashboard";
import { fetchTelemetrySnapshot } from "@/lib/opensky";
import type { TelemetrySnapshot } from "@/lib/types";

// The first snapshot is fetched per-request on the server (credentials stay
// server-side); the client then polls our API route via TanStack Query.
export const dynamic = "force-dynamic";

export default async function AppPage() {
  let initialSnapshot: TelemetrySnapshot | null = null;
  try {
    initialSnapshot = await fetchTelemetrySnapshot();
  } catch {
    // First paint proceeds without data; the client query retries and the
    // dashboard shows feed status instead of failing the whole page.
  }

  return <Dashboard initialSnapshot={initialSnapshot} />;
}
