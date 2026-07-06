"use client";

import { useMemo, useState } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { AIRPORTS } from "@/lib/airports";
import { latLonToVector3 } from "@/lib/geo";
import type { Airport } from "@/lib/types";
import type { GlobeColors } from "@/components/globe/globe-theme";

/**
 * Major airports as distinct 3D diamond beacons pinned to the surface, with a
 * hover tooltip naming the field. In `prominent` mode (airports-only view)
 * they glow brighter but keep the same size, so the layer reads as primary
 * without the icons ballooning.
 */
export function AirportsLayer({
  colors,
  prominent = false,
}: {
  colors: GlobeColors;
  prominent?: boolean;
}) {
  const [hovered, setHovered] = useState<Airport | null>(null);

  const entries = useMemo(
    () =>
      AIRPORTS.map((airport) => ({
        airport,
        position: latLonToVector3(airport.latitude, airport.longitude, 0)
          .multiplyScalar(1.004),
        // Orient each diamond so a point sticks straight out of the surface.
        quaternion: new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          latLonToVector3(airport.latitude, airport.longitude, 0).normalize(),
        ),
      })),
    [],
  );

  // Faceted, lit gem: flat shading + a little metalness catches the scene
  // lights so the octahedron reads as a 3D beacon rather than a flat dot.
  const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: colors.airport,
        emissive: new THREE.Color(colors.airport),
        emissiveIntensity: prominent ? 0.65 : 0.3,
        metalness: 0.45,
        roughness: 0.25,
        flatShading: true,
      }),
    [colors.airport, prominent],
  );

  // Constant world size — unchanged between normal and airports-only views.
  const scale = 0.006;

  return (
    <group>
      {entries.map(({ airport, position, quaternion }) => (
        <mesh
          key={airport.iata}
          position={position}
          quaternion={quaternion}
          scale={scale}
          geometry={geometry}
          material={material}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(airport);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered((prev) => (prev?.iata === airport.iata ? null : prev));
            document.body.style.cursor = "auto";
          }}
        />
      ))}
      {hovered && (
        <Html
          position={latLonToVector3(hovered.latitude, hovered.longitude, 0)
            .multiplyScalar(1.02)
            .toArray()}
          center
          zIndexRange={[40, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-center whitespace-nowrap rounded-md border border-line bg-panel-solid px-2.5 py-1.5 text-[11px] leading-none shadow-lg">
            <span className="font-semibold text-ink">{hovered.iata}</span>
            <span className="text-ink-2">&nbsp;·&nbsp;{hovered.name}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
