"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { latLonToVector3 } from "@/lib/geo";
import type { TrackPoint } from "@/lib/types";

/** Lift paths slightly above the surface to avoid z-fighting the coastlines. */
const PATH_LIFT_M = 600;

function FlightPath({ points, color }: { points: TrackPoint[]; color: string }) {
  const vectors = useMemo(
    () =>
      points.map((p) =>
        latLonToVector3(
          p.latitude,
          p.longitude,
          (p.altitude ?? 0) + PATH_LIFT_M,
          new THREE.Vector3(),
        ),
      ),
    [points],
  );
  if (vectors.length < 2) return null;
  return (
    <Line
      points={vectors}
      color={color}
      lineWidth={1.4}
      dashed
      dashSize={0.012}
      gapSize={0.008}
      transparent
      opacity={0.85}
    />
  );
}

/**
 * Dashed flight paths for tracked targets: departure → current position when
 * OpenSky has the track, otherwise the session-recorded trail.
 */
export function FlightPathsLayer({
  paths,
  color,
}: {
  paths: Record<string, TrackPoint[]>;
  color: string;
}) {
  return (
    <>
      {Object.entries(paths).map(([id, points]) => (
        <FlightPath key={id} points={points} color={color} />
      ))}
    </>
  );
}
