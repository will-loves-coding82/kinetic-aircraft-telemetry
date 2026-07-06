import * as THREE from "three";

/** Outline of a plane silhouette (top view, nose up, unit length). */
export const PLANE_OUTLINE: [number, number][] = [
  [0.0, 0.52],
  [0.07, 0.4],
  [0.08, 0.14],
  [0.48, -0.05],
  [0.48, -0.14],
  [0.08, -0.04],
  [0.06, -0.3],
  [0.22, -0.44],
  [0.22, -0.52],
  [0.04, -0.46],
  [0.04, -0.52],
  [-0.04, -0.52],
  [-0.04, -0.46],
  [-0.22, -0.52],
  [-0.22, -0.44],
  [-0.06, -0.3],
  [-0.08, -0.04],
  [-0.48, -0.14],
  [-0.48, -0.05],
  [-0.08, 0.14],
  [-0.07, 0.4],
];

/**
 * The aircraft marker mesh shared by the dashboard's instanced swarm and the
 * landing page's decorative globe — one source of truth for the silhouette.
 */
export function buildPlaneGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(...PLANE_OUTLINE[0]);
  for (let i = 1; i < PLANE_OUTLINE.length; i++) {
    shape.lineTo(...PLANE_OUTLINE[i]);
  }
  shape.closePath();
  // A little thickness so the silhouette doesn't vanish edge-on.
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -0.05);
  // Lay flat on the tangent plane with the nose along +Z (the track axis).
  geometry.rotateX(Math.PI / 2);
  return geometry;
}
