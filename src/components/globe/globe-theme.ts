import type { FlightStatus } from "@/lib/types";
import type { Theme } from "@/context/ThemeContext";

/**
 * Three.js material colors per app theme. These mirror the CSS custom
 * properties in globals.css — WebGL can't read CSS variables, so the globe
 * gets its own copy keyed by the same theme.
 */
export interface GlobeColors {
  ocean: string;
  border: string;
  graticule: string;
  atmosphere: string;
  status: Record<FlightStatus, string>;
  airport: string;
  selected: string;
  tracked: string;
  /** Grey-out color for de-emphasized aircraft while one is selected. */
  dimmed: string;
}

export const GLOBE_COLORS: Record<Theme, GlobeColors> = {
  light: {
    // Deliberately a few steps darker/bluer than the page background
    // (#eaeef2) so the globe reads as a distinct sphere rather than blending
    // into the page — the old value (#e4e9ef) sat almost exactly on top of
    // it (contrast ~1.05:1), leaving the planet looking like a flat gray disc.
    ocean: "#bcd0e6",
    border: "#57697d",
    graticule: "#9fb3c8",
    atmosphere: "#3d7fd6",
    status: {
      climb: "#008300",
      cruise: "#2a78d6",
      descent: "#c98500",
      ground: "#898781",
      alert: "#d03b3b",
    },
    airport: "#4a3aa7",
    selected: "#0b0b0b",
    tracked: "#0b0b0b",
    // A touch darker than before so de-emphasized aircraft stay faintly
    // visible against the new, more saturated ocean instead of vanishing.
    dimmed: "#8b98a8",
  },
  dark: {
    ocean: "#11151b",
    border: "#57616b",
    graticule: "#232a31",
    atmosphere: "#3987e5",
    status: {
      climb: "#008300",
      cruise: "#3987e5",
      descent: "#c98500",
      ground: "#898781",
      alert: "#d03b3b",
    },
    airport: "#9085e9",
    selected: "#ffffff",
    tracked: "#ffffff",
    dimmed: "#3d3d3a",
  },
};
