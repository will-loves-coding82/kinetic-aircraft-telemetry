"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { mesh as topoMesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import worldAtlas from "world-atlas/countries-110m.json";
import {
  GLOBE_RADIUS,
  graticuleSegments,
  latLonToVector3,
  multiLineToSegments,
} from "@/lib/geo";
import { buildPlaneGeometry } from "@/components/globe/plane-geometry";
import { AIRPORTS } from "@/lib/airports";

type WorldTopology = Topology<{ countries: GeometryCollection }>;

function buildBorderPositions(): Float32Array {
  const topology = worldAtlas as unknown as WorldTopology;
  const borders = topoMesh(topology, topology.objects.countries);
  const lines =
    borders.type === "MultiLineString"
      ? borders.coordinates
      : [borders.coordinates];
  return multiLineToSegments(lines as number[][][], GLOBE_RADIUS * 1.001);
}

/** A handful of scripted great-circle flights, purely decorative. */
const MOCK_ROUTES: { from: [number, number]; to: [number, number] }[] = [
  { from: [40.64, -73.78], to: [51.47, -0.45] }, // JFK–LHR
  { from: [35.55, 139.78], to: [1.36, 103.99] }, // HND–SIN
  { from: [33.94, -118.41], to: [-33.95, 151.18] }, // LAX–SYD
  { from: [25.25, 55.36], to: [48.35, 11.79] }, // DXB–MUC
  { from: [-23.44, -46.47], to: [40.64, -73.78] }, // GRU–JFK
  { from: [1.36, 103.99], to: [25.25, 55.36] }, // SIN–DXB
];

function toVec(lat: number, lon: number): THREE.Vector3 {
  return latLonToVector3(lat, lon, 0).normalize();
}

function slerp(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a.clone();
  const s = Math.sin(omega);
  return a
    .clone()
    .multiplyScalar(Math.sin((1 - t) * omega) / s)
    .addScaledVector(b, Math.sin(t * omega) / s);
}

const scratchUp = new THREE.Vector3();
const scratchForward = new THREE.Vector3();
const scratchRight = new THREE.Vector3();
const scratchBasis = new THREE.Matrix4();

/** Plane silhouettes gliding along the scripted routes, nose along track. */
function MockAircraft() {
  const geometry = useMemo(() => buildPlaneGeometry(), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#3987e5" }),
    [],
  );
  const routes = useMemo(
    () =>
      MOCK_ROUTES.map((r, i) => ({
        a: toVec(...r.from),
        b: toVec(...r.to),
        speed: 0.04 + (i % 3) * 0.015,
        offset: i * 1.7,
      })),
    [],
  );
  const planes = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    routes.forEach((route, i) => {
      const plane = planes.current[i];
      if (!plane) return;
      const progress = ((t * route.speed + route.offset) % 1 + 1) % 1;
      const pos = slerp(route.a, route.b, progress).multiplyScalar(1.012);
      const ahead = slerp(route.a, route.b, Math.min(progress + 0.002, 1))
        .multiplyScalar(1.012);
      plane.position.copy(pos);

      // Orient: local +Y along the surface normal, nose (+Z) along the route.
      const up = scratchUp.copy(pos).normalize();
      scratchForward.copy(ahead).sub(pos);
      scratchForward.addScaledVector(up, -scratchForward.dot(up));
      if (scratchForward.lengthSq() < 1e-12) scratchForward.set(1, 0, 0);
      scratchForward.normalize();
      scratchRight.crossVectors(up, scratchForward).normalize();
      plane.quaternion.setFromRotationMatrix(
        scratchBasis.makeBasis(scratchRight, up, scratchForward),
      );
    });
  });

  return (
    <group>
      {routes.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) planes.current[i] = el;
          }}
          geometry={geometry}
          material={material}
          scale={0.045}
        />
      ))}
    </group>
  );
}

/** The same violet airport beacons as the dashboard, purely decorative. */
function MockAirports() {
  const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9085e9",
        emissive: new THREE.Color("#9085e9"),
        emissiveIntensity: 0.35,
        metalness: 0.45,
        roughness: 0.25,
        flatShading: true,
      }),
    [],
  );
  const entries = useMemo(
    () =>
      AIRPORTS.map((airport) => ({
        position: latLonToVector3(airport.latitude, airport.longitude, 0)
          .multiplyScalar(1.004),
        quaternion: new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          latLonToVector3(airport.latitude, airport.longitude, 0).normalize(),
        ),
      })),
    [],
  );

  return (
    <group>
      {entries.map((entry, i) => (
        <mesh
          key={i}
          position={entry.position}
          quaternion={entry.quaternion}
          scale={0.01}
          geometry={geometry}
          material={material}
        />
      ))}
    </group>
  );
}

function Globe() {
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

  return (
    <group rotation={[0.15, 0, 0.06]}>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial color="#11151b" roughness={0.95} metalness={0} />
      </mesh>
      <lineSegments geometry={borderGeometry}>
        <lineBasicMaterial color="#3a4552" transparent opacity={0.85} />
      </lineSegments>
      <lineSegments geometry={graticuleGeometry}>
        <lineBasicMaterial color="#232a31" transparent opacity={0.5} />
      </lineSegments>
      <MockAircraft />
      <MockAirports />
    </group>
  );
}

/**
 * Decorative, lightweight globe for the landing page hero: the same
 * continent/graticule geometry, plane silhouette, and airport beacons as the
 * real dashboard, plus a handful of scripted flights looping along
 * great-circle routes. Auto-rotates and accepts drag-to-rotate, but zoom/pan
 * are disabled — it's atmosphere, not a tool, so the interaction surface is
 * deliberately small ("somewhat interactive").
 */
export function MockGlobe({ className = "" }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 2, 2]} intensity={0.6} />
        <Stars radius={12} depth={20} count={800} factor={1.4} fade speed={0.3} />
        <Globe />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          rotateSpeed={0.35}
          minPolarAngle={Math.PI / 2 - 0.6}
          maxPolarAngle={Math.PI / 2 + 0.6}
        />
      </Canvas>
    </div>
  );
}
