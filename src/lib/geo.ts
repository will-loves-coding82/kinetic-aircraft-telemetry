import * as THREE from "three";

/** Globe radius in scene units. Everything on the globe derives from this. */
export const GLOBE_RADIUS = 1;

/** Mean earth radius in meters, used to scale real altitudes to scene units. */
export const EARTH_RADIUS_M = 6_371_000;

/**
 * Real altitudes are visually invisible at true scale (a cruising jet sits
 * 0.0018 radii up), so they are exaggerated to give the swarm depth.
 */
export const ALTITUDE_EXAGGERATION = 25;

const DEG = Math.PI / 180;

/**
 * Map lat/lon (+ altitude in meters) to a position on/above the globe.
 * Uses the standard three.js sphere mapping so the wireframe continents and
 * markers agree.
 */
export function latLonToVector3(
  latitude: number,
  longitude: number,
  altitudeMeters = 0,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const radius =
    GLOBE_RADIUS +
    (Math.max(altitudeMeters, 0) / EARTH_RADIUS_M) * ALTITUDE_EXAGGERATION;
  const phi = (90 - latitude) * DEG;
  const theta = (longitude + 180) * DEG;
  target.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
  return target;
}

const NORTH_POLE = new THREE.Vector3(0, 1, 0);
const scratchUp = new THREE.Vector3();
const scratchEast = new THREE.Vector3();
const scratchNorth = new THREE.Vector3();
const scratchForward = new THREE.Vector3();
const scratchRight = new THREE.Vector3();

/**
 * Build a rotation for a marker sitting at `position`, with local +Y along the
 * surface normal and local +Z pointing along `trackDegrees` (clockwise from
 * north). Falls back to an arbitrary tangent at the poles.
 */
export function orientationAt(
  position: THREE.Vector3,
  trackDegrees: number | null,
  target = new THREE.Matrix4(),
): THREE.Matrix4 {
  const up = scratchUp.copy(position).normalize();
  scratchEast.crossVectors(NORTH_POLE, up);
  if (scratchEast.lengthSq() < 1e-8) scratchEast.set(1, 0, 0);
  scratchEast.normalize();
  scratchNorth.crossVectors(up, scratchEast).normalize();

  const track = (trackDegrees ?? 0) * DEG;
  scratchForward
    .copy(scratchNorth)
    .multiplyScalar(Math.cos(track))
    .addScaledVector(scratchEast, Math.sin(track))
    .normalize();
  scratchRight.crossVectors(up, scratchForward).normalize();
  return target.makeBasis(scratchRight, up, scratchForward);
}

/**
 * Build line-segment positions (as a flat Float32Array) from GeoJSON
 * MultiLineString coordinates, projected onto the globe at `radius`.
 */
export function multiLineToSegments(
  coordinates: number[][][],
  radius: number,
): Float32Array {
  let count = 0;
  for (const line of coordinates) count += Math.max(line.length - 1, 0) * 2;
  const positions = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  let offset = 0;
  const write = (lon: number, lat: number) => {
    latLonToVector3(lat, lon, 0, v).setLength(radius);
    positions[offset++] = v.x;
    positions[offset++] = v.y;
    positions[offset++] = v.z;
  };
  for (const line of coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      write(line[i][0], line[i][1]);
      write(line[i + 1][0], line[i + 1][1]);
    }
  }
  return positions;
}

/** Graticule (lat/lon grid) line segments at `stepDegrees` spacing. */
export function graticuleSegments(
  radius: number,
  stepDegrees = 20,
  resolution = 4,
): Float32Array {
  const lines: number[][][] = [];
  for (let lat = -60; lat <= 60; lat += stepDegrees) {
    const line: number[][] = [];
    for (let lon = -180; lon <= 180; lon += resolution) line.push([lon, lat]);
    lines.push(line);
  }
  for (let lon = -180; lon < 180; lon += stepDegrees) {
    const line: number[][] = [];
    for (let lat = -85; lat <= 85; lat += resolution) line.push([lon, lat]);
    lines.push(line);
  }
  return multiLineToSegments(lines, radius);
}
