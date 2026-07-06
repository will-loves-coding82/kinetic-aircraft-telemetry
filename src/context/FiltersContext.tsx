"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FlightStatus } from "@/lib/types";

const ALL_STATUSES: FlightStatus[] = [
  "climb",
  "cruise",
  "descent",
  "ground",
  "alert",
];

interface FiltersContextValue {
  /** Statuses currently shown on the globe. */
  statuses: Set<FlightStatus>;
  toggleStatus: (status: FlightStatus) => void;
  /** Origin countries to isolate; empty set = show all countries. */
  countries: Set<string>;
  toggleCountry: (country: string) => void;
  /** When true, hide all aircraft and show only airports on the globe. */
  airportsOnly: boolean;
  toggleAirportsOnly: () => void;
  /** When true, hide every aircraft except tracked/followed/selected targets. */
  trackedOnly: boolean;
  toggleTrackedOnly: () => void;
  /** Altitude bin index (into ALTITUDE_BINS_KM) to isolate; null = show all. */
  altitudeBinIndex: number | null;
  toggleAltitudeBin: (index: number) => void;
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

const FiltersContext = createContext<FiltersContextValue | null>(null);

/** User-selected visibility filters for the globe and FOV stats. */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Set<FlightStatus>>(
    () => new Set(ALL_STATUSES),
  );
  const [countries, setCountries] = useState<Set<string>>(() => new Set());
  const [airportsOnly, setAirportsOnly] = useState(false);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [altitudeBinIndex, setAltitudeBinIndex] = useState<number | null>(null);

  const toggleStatus = useCallback((status: FlightStatus) => {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        // Never allow hiding everything — keep at least one status on.
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const toggleCountry = useCallback((country: string) => {
    setCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  }, []);

  // Mutually exclusive: one hides all aircraft, the other isolates a few —
  // turning one on turns the other off so their intents can't conflict.
  const toggleAirportsOnly = useCallback(() => {
    setAirportsOnly((prev) => !prev);
    setTrackedOnly(false);
  }, []);

  const toggleTrackedOnly = useCallback(() => {
    setTrackedOnly((prev) => !prev);
    setAirportsOnly(false);
  }, []);

  // Clicking the already-selected bar clears the filter (toggle behavior);
  // clicking a different bar switches the isolated range.
  const toggleAltitudeBin = useCallback((index: number) => {
    setAltitudeBinIndex((prev) => (prev === index ? null : index));
  }, []);

  const clearFilters = useCallback(() => {
    setStatuses(new Set(ALL_STATUSES));
    setCountries(new Set());
    setAirportsOnly(false);
    setTrackedOnly(false);
    setAltitudeBinIndex(null);
  }, []);

  const hasActiveFilters =
    statuses.size < ALL_STATUSES.length ||
    countries.size > 0 ||
    airportsOnly ||
    trackedOnly ||
    altitudeBinIndex != null;

  const value = useMemo(
    () => ({
      statuses,
      toggleStatus,
      countries,
      toggleCountry,
      airportsOnly,
      toggleAirportsOnly,
      trackedOnly,
      toggleTrackedOnly,
      altitudeBinIndex,
      toggleAltitudeBin,
      hasActiveFilters,
      clearFilters,
    }),
    [
      statuses,
      toggleStatus,
      countries,
      toggleCountry,
      airportsOnly,
      toggleAirportsOnly,
      trackedOnly,
      toggleTrackedOnly,
      altitudeBinIndex,
      toggleAltitudeBin,
      hasActiveFilters,
      clearFilters,
    ],
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within FiltersProvider");
  return ctx;
}
