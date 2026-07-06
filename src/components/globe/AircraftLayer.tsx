"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { GLOBE_RADIUS, latLonToVector3, orientationAt } from "@/lib/geo";
import { buildPlaneGeometry } from "@/components/globe/plane-geometry";
import type { Aircraft } from "@/lib/types";
import type { GlobeColors } from "@/components/globe/globe-theme";

/** Upper bound on instanced aircraft; OpenSky peaks around 12–14k airborne. */
const MAX_INSTANCES = 20_000;

/**
 * Markers keep a roughly constant *screen* size by scaling their world size
 * with camera distance — so zooming into a cluster spreads the icons apart
 * (their centers separate) while each stays small enough to pick individually.
 */
const SCREEN_SCALE = 0.0038;
const MIN_WORLD_SCALE = 0.004;
const MAX_WORLD_SCALE = 0.02;

interface AircraftLayerProps {
  aircraft: Aircraft[];
  colors: GlobeColors;
  /** When set, every other aircraft is greyed out (emphasis). */
  selectedId: string | null;
  /** Shared mutable map of icao24 → world position, read by camera/FOV/markers. */
  positions: Map<string, THREE.Vector3>;
  onSelect: (id: string) => void;
}

/**
 * Every aircraft as one instance of a small plane silhouette, colored by
 * flight status and oriented along its true track — a single draw call for
 * the whole global swarm.
 *
 * Picking uses a custom per-instance sphere raycast (with a horizon test so
 * aircraft behind the planet can't be clicked): forgiving hit targets that
 * scale with zoom, at a fraction of the cost of triangle raycasting.
 */
export function AircraftLayer({
  aircraft,
  colors,
  selectedId,
  positions,
  onSelect,
}: AircraftLayerProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const basePositions = useRef(new Float32Array(MAX_INSTANCES * 3));
  const baseQuaternions = useRef(new Float32Array(MAX_INSTANCES * 4));
  const onGround = useRef(new Uint8Array(MAX_INSTANCES));
  const countRef = useRef(0);
  const lastScale = useRef(SCREEN_SCALE * 2.5);

  const geometry = useMemo(() => buildPlaneGeometry(), []);
  const material = useMemo(() => new THREE.MeshBasicMaterial(), []);

  // Recompose every instance matrix at a given world scale (cheap; called on
  // data change and whenever the camera distance shifts noticeably).
  const rebuildMatrices = useCallback((scale: number) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scaleVec = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const count = countRef.current;
    for (let i = 0; i < count; i++) {
      position.set(
        basePositions.current[i * 3],
        basePositions.current[i * 3 + 1],
        basePositions.current[i * 3 + 2],
      );
      quaternion.set(
        baseQuaternions.current[i * 4],
        baseQuaternions.current[i * 4 + 1],
        baseQuaternions.current[i * 4 + 2],
        baseQuaternions.current[i * 4 + 3],
      );
      const s = onGround.current[i] ? scale * 0.6 : scale;
      scaleVec.set(s, s, s);
      matrix.compose(position, quaternion, scaleVec);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  // Ingest a new snapshot: positions, orientations, colors.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const position = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const color = new THREE.Color();
    const statusColors = colors.status;

    positions.clear();
    const count = Math.min(aircraft.length, MAX_INSTANCES);
    for (let i = 0; i < count; i++) {
      const a = aircraft[i];
      const altitude = a.onGround ? 0 : (a.baroAltitude ?? a.geoAltitude ?? 0);
      latLonToVector3(a.latitude, a.longitude, altitude, position);
      positions.set(a.icao24, position.clone());
      basePositions.current[i * 3] = position.x;
      basePositions.current[i * 3 + 1] = position.y;
      basePositions.current[i * 3 + 2] = position.z;

      orientationAt(position, a.trueTrack, basis);
      quaternion.setFromRotationMatrix(basis);
      baseQuaternions.current[i * 4] = quaternion.x;
      baseQuaternions.current[i * 4 + 1] = quaternion.y;
      baseQuaternions.current[i * 4 + 2] = quaternion.z;
      baseQuaternions.current[i * 4 + 3] = quaternion.w;
      onGround.current[i] = a.onGround ? 1 : 0;

      const dim = selectedId !== null && a.icao24 !== selectedId;
      mesh.setColorAt(i, color.set(dim ? colors.dimmed : statusColors[a.status]));
    }
    countRef.current = count;
    mesh.count = count;
    rebuildMatrices(lastScale.current);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [aircraft, colors, selectedId, positions, rebuildMatrices]);

  // Keep marker screen-size roughly constant across zoom.
  useFrame(({ camera }) => {
    const distance = camera.position.length();
    const target = THREE.MathUtils.clamp(
      distance * SCREEN_SCALE,
      MIN_WORLD_SCALE,
      MAX_WORLD_SCALE,
    );
    if (Math.abs(target - lastScale.current) / lastScale.current > 0.02) {
      lastScale.current = target;
      rebuildMatrices(target);
    }
  });

  // Cheap, forgiving picking: ray-to-center distance per instance.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const point = new THREE.Vector3();

    mesh.raycast = (raycaster, intersects) => {
      const origin = raycaster.ray.origin;
      const cameraDistance = origin.length();
      const horizonCos =
        GLOBE_RADIUS / Math.max(cameraDistance, GLOBE_RADIUS + 1e-4);

      for (let i = 0; i < mesh.count; i++) {
        const px = basePositions.current[i * 3];
        const py = basePositions.current[i * 3 + 1];
        const pz = basePositions.current[i * 3 + 2];
        const len = Math.sqrt(px * px + py * py + pz * pz) || 1;
        // Skip aircraft on the far side of the planet.
        const dot =
          (px * origin.x + py * origin.y + pz * origin.z) /
          (len * cameraDistance);
        if (dot < horizonCos - 0.03) continue;

        point.set(px, py, pz);
        const distance = origin.distanceTo(point);
        // Hit radius ≈ constant screen size; smaller than the marker gap so
        // dense clusters stay individually pickable.
        const hitRadius = Math.max(distance * 0.006, MIN_WORLD_SCALE);
        if (raycaster.ray.distanceSqToPoint(point) <= hitRadius * hitRadius) {
          intersects.push({
            distance,
            point: point.clone(),
            object: mesh,
            instanceId: i,
          });
        }
      }
    };
  }, []);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (event.instanceId == null) return;
    const target = aircraft[event.instanceId];
    if (target) onSelect(target.icao24);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_INSTANCES]}
      onClick={handleClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
      frustumCulled={false}
    />
  );
}
