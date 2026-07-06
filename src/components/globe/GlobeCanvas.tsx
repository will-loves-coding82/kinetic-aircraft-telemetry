"use client";

import { useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { useTheme } from "@/context/ThemeContext";
import { GLOBE_COLORS } from "@/components/globe/globe-theme";
import { Earth } from "@/components/globe/Earth";
import { AircraftLayer } from "@/components/globe/AircraftLayer";
import { AirportsLayer } from "@/components/globe/AirportsLayer";
import { FlightPathsLayer } from "@/components/globe/FlightPathsLayer";
import { TargetRing } from "@/components/globe/TargetRing";
import { CameraRig } from "@/components/globe/CameraRig";
import { FovTracker } from "@/components/globe/FovTracker";
import type { Aircraft, TrackPoint } from "@/lib/types";

interface GlobeCanvasProps {
  aircraft: Aircraft[];
  selectedId: string | null;
  trackedIds: string[];
  followedId: string | null;
  /** Flight paths (per tracked icao24) rendered as dashed lines. */
  paths: Record<string, TrackPoint[]>;
  /** Camera pitch, 0 (globe center) → 1 (grazing surface views). */
  pitch: number;
  /** Vertical zoom slider request — see CameraRig's zoomRequest prop. */
  zoomRequest: { value: number; nonce: number } | null;
  /** Hide aircraft and emphasize airports. */
  airportsOnly: boolean;
  onSelect: (id: string | null) => void;
}

/**
 * The 3D world. Context values are read out here (outside the Canvas) and
 * passed down as props, since the R3F reconciler doesn't share React context
 * with the DOM tree.
 */
export function GlobeCanvas({
  aircraft,
  selectedId,
  trackedIds,
  followedId,
  paths,
  pitch,
  zoomRequest,
  airportsOnly,
  onSelect,
}: GlobeCanvasProps) {
  const { theme } = useTheme();
  const colors = GLOBE_COLORS[theme];
  // Stable identity for the app's lifetime; mutated by AircraftLayer each poll.
  const [positions] = useState(() => new Map<string, THREE.Vector3>());

  return (
    <div className="absolute inset-0" aria-label="3D globe of live air traffic">
      <Canvas
        camera={{ position: [0.4, 0.9, 2.5], fov: 45, near: 0.01, far: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => onSelect(null)}
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 2, 2]} intensity={0.7} />
        {theme === "dark" && (
          <Stars radius={14} depth={24} count={1600} factor={1.6} fade speed={0.4} />
        )}
        <Earth colors={colors} />
        <AircraftLayer
          aircraft={aircraft}
          colors={colors}
          selectedId={selectedId}
          positions={positions}
          onSelect={onSelect}
        />
        <AirportsLayer colors={colors} prominent={airportsOnly} />
        <FlightPathsLayer paths={paths} color={colors.tracked} />
        {selectedId && (
          <TargetRing
            id={selectedId}
            positions={positions}
            color={colors.selected}
            pulse
          />
        )}
        {trackedIds
          .filter((id) => id !== selectedId)
          .map((id) => (
            <TargetRing
              key={id}
              id={id}
              positions={positions}
              color={colors.tracked}
            />
          ))}
        <CameraRig
          followedId={followedId}
          positions={positions}
          pitch={pitch}
          zoomRequest={zoomRequest}
        />
        <FovTracker positions={positions} />
      </Canvas>
    </div>
  );
}
