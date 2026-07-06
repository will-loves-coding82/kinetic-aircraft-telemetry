"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { TelemetryError, TelemetrySnapshot } from "@/lib/types";

/** How often the client asks our API route for fresh state vectors. */
export const POLL_INTERVAL_MS = 180_000;

export class TelemetryFetchError extends Error {
  constructor(
    message: string,
    public readonly rateLimited: boolean,
  ) {
    super(message);
    this.name = "TelemetryFetchError";
  }
}

async function fetchSnapshot(): Promise<TelemetrySnapshot> {
  const res = await fetch("/api/opensky/states");
  if (!res.ok) {
    let body: Partial<TelemetryError> = {};
    try {
      body = (await res.json()) as TelemetryError;
    } catch {
      // non-JSON error body — fall through to the generic message
    }
    throw new TelemetryFetchError(
      body.error ?? `Telemetry request failed (${res.status})`,
      body.rateLimited ?? res.status === 429,
    );
  }
  return (await res.json()) as TelemetrySnapshot;
}

/**
 * Live telemetry feed. TanStack Query gives us polling, request deduping,
 * and keeps the last good snapshot on screen while a refetch fails —
 * the globe never blanks out on a transient upstream error.
 */
export function useTelemetry(
  initialSnapshot: TelemetrySnapshot | null,
): UseQueryResult<TelemetrySnapshot, TelemetryFetchError> {
  return useQuery<TelemetrySnapshot, TelemetryFetchError>({
    queryKey: ["opensky", "states"],
    queryFn: fetchSnapshot,
    initialData: initialSnapshot ?? undefined,
    initialDataUpdatedAt: initialSnapshot?.fetchedAt,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: POLL_INTERVAL_MS - 5_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => !error.rateLimited && failureCount < 2,
  });
}
