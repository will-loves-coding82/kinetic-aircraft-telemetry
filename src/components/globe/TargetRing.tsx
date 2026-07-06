"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const scratchNormal = new THREE.Vector3();

interface TargetRingProps {
  /** icao24 of the aircraft this ring highlights. */
  id: string;
  positions: Map<string, THREE.Vector3>;
  color: string;
  /** Pulse animation for the actively selected target. */
  pulse?: boolean;
}

/** Highlight ring laid flat on the tangent plane under a target aircraft. */
export function TargetRing({ id, positions, color, pulse = false }: TargetRingProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const position = positions.get(id);
    if (!position) {
      group.visible = false;
      return;
    }
    group.visible = true;
    group.position.copy(position);
    group.quaternion.setFromUnitVectors(
      Z_AXIS,
      scratchNormal.copy(position).normalize(),
    );
    const scale = pulse ? 1 + 0.16 * Math.sin(clock.elapsedTime * 5) : 1;
    group.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <ringGeometry args={pulse ? [0.016, 0.02, 40] : [0.011, 0.0135, 32]} />
        <meshBasicMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
