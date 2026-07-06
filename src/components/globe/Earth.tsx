"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mesh as topoMesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";
import { GLOBE_RADIUS, graticuleSegments, multiLineToSegments } from "@/lib/geo";
import type { GlobeColors } from "@/components/globe/globe-theme";

type WorldTopology = Topology<{ countries: GeometryCollection }>;

/** Build coastline + country-border line segments once per app load. */
function buildBorderPositions(): Float32Array {
  const topology = worldAtlas as unknown as WorldTopology;
  const borders = topoMesh(topology, topology.objects.countries);
  const lines =
    borders.type === "MultiLineString"
      ? borders.coordinates
      : [borders.coordinates];
  return multiLineToSegments(lines as number[][][], GLOBE_RADIUS * 1.001);
}

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying vec3 vNormal;
  void main() {
    float rim = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    gl_FragColor = vec4(uColor, clamp(rim, 0.0, 1.0) * 0.9);
  }
`;

/** The planet: ocean sphere, wireframe continents, graticule, rim glow. */
export function Earth({ colors }: { colors: GlobeColors }) {
  const borderGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(buildBorderPositions(), 3),
    );
    return geometry;
  }, []);

  const graticuleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(graticuleSegments(GLOBE_RADIUS * 1.0005), 3),
    );
    return geometry;
  }, []);

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        uniforms: { uColor: { value: new THREE.Color(colors.atmosphere) } },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; color updates below
    [],
  );

  useEffect(() => {
    (atmosphereMaterial.uniforms.uColor.value as THREE.Color).set(
      colors.atmosphere,
    );
  }, [atmosphereMaterial, colors.atmosphere]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color={colors.ocean}
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      <lineSegments geometry={borderGeometry}>
        <lineBasicMaterial color={colors.border} transparent opacity={0.9} />
      </lineSegments>
      <lineSegments geometry={graticuleGeometry}>
        <lineBasicMaterial
          color={colors.graticule}
          transparent
          opacity={0.55}
        />
      </lineSegments>
      <mesh scale={1.12} material={atmosphereMaterial}>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      </mesh>
    </group>
  );
}
