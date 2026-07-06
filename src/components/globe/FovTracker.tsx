"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GLOBE_RADIUS } from "@/lib/geo";
import { publishFov } from "@/lib/fov-store";

const scratch = new THREE.Vector3();

/** How often the visible set is recomputed and published to the panels. */
const INTERVAL_S = 0.5;

/**
 * Publishes which aircraft are inside the camera's FOV (frustum test plus a
 * horizon test so aircraft behind the planet don't count).
 */
export function FovTracker({
  positions,
}: {
  positions: Map<string, THREE.Vector3>;
}) {
  const accumulator = useRef(0);
  const lastKey = useRef("");

  useFrame(({ camera }, delta) => {
    accumulator.current += delta;
    if (accumulator.current < INTERVAL_S) return;
    accumulator.current = 0;

    const cameraDistance = camera.position.length();
    // cos of the angle from globe center to the visible horizon.
    const horizonCos = GLOBE_RADIUS / Math.max(cameraDistance, GLOBE_RADIUS + 1e-4);
    const camX = camera.position.x / cameraDistance;
    const camY = camera.position.y / cameraDistance;
    const camZ = camera.position.z / cameraDistance;

    const ids: string[] = [];
    positions.forEach((position, id) => {
      const len = position.length();
      const dot =
        (position.x * camX + position.y * camY + position.z * camZ) / len;
      if (dot < horizonCos - 0.03) return;
      scratch.copy(position).project(camera);
      if (
        scratch.x < -1 || scratch.x > 1 ||
        scratch.y < -1 || scratch.y > 1 ||
        scratch.z > 1
      ) {
        return;
      }
      ids.push(id);
    });

    // Skip publishing identical sets so panels don't re-render for nothing.
    const key = `${ids.length}:${ids[0] ?? ""}:${ids[ids.length - 1] ?? ""}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    publishFov(ids);
  });

  return null;
}
