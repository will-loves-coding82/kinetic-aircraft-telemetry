"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GLOBE_RADIUS } from "@/lib/geo";

const ORIGIN = new THREE.Vector3(0, 0, 0);
const WORLD_Y = new THREE.Vector3(0, 1, 0);
const scratchAnchor = new THREE.Vector3();
const scratchOldTarget = new THREE.Vector3();
const scratchDelta = new THREE.Vector3();
const scratchUp = new THREE.Vector3();
const scratchDesiredUp = new THREE.Vector3();
const scratchOffset = new THREE.Vector3();
const scratchHoriz = new THREE.Vector3();
const scratchDesired = new THREE.Vector3();
const scratchForwardDir = new THREE.Vector3();
const scratchHitPoint = new THREE.Vector3();

/**
 * Nearest point where a ray hits a sphere of `radius` centered at the
 * origin, if any. Used to find where the camera is *actually* looking on
 * the globe (screen-center raycast), rather than inferring it indirectly
 * from wherever `controls.target` happens to already be.
 */
function raySphereNear(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  radius: number,
  out: THREE.Vector3,
): boolean {
  const b = origin.dot(dir);
  const c = origin.dot(origin) - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return false;
  const t = -b - Math.sqrt(disc);
  if (t < 0) return false;
  out.copy(origin).addScaledVector(dir, t);
  return true;
}

/**
 * Camera elevation above the local horizon. At typical "overview" follow
 * distances the base elevation is steep (near top-down); as the user zooms
 * in it eases down toward a much lower, more horizontal angle. This matters
 * because the followed-aircraft anchor itself floats at an exaggerated
 * altitude (see ALTITUDE_EXAGGERATION in lib/geo.ts) — getting numerically
 * close to that anchor while still looking straight down at it leaves the
 * camera far above the visual ground, which read as "zoom doesn't get
 * close." The pitch slider further lowers elevation on top of this, down to
 * MIN_ELEVATION_DEG. Kept short of 90° so the view direction is never
 * parallel to the surface normal (gimbal-lock).
 */
const FAR_ELEVATION_DEG = 80;
const NEAR_ELEVATION_DEG = 18;
const MIN_ELEVATION_DEG = 6;
/** Distance at/above which the base elevation is FAR_ELEVATION_DEG. */
const FAR_ELEVATION_DISTANCE = 2.2;

/**
 * Closest allowed camera distance in the default, steady-state orbit (no
 * follow, no pitch — target is the globe center). Right down near the
 * mathematical sphere surface (radius 1).
 */
const MIN_DISTANCE = 1.05;

/**
 * Closest allowed camera distance whenever follow and/or pitch is active,
 * i.e. whenever the orbit target is a near-surface point (a followed
 * aircraft, or the raycasted pitch pivot) rather than the globe center. Much
 * smaller than MIN_DISTANCE: both the aircraft marker's own world-space size
 * (~0.004–0.02 units, see AircraftLayer's MIN/MAX_WORLD_SCALE) and "the pivot
 * point itself" are tiny compared to the globe radius — a floor tuned for
 * approaching the *sphere surface from its center* left the camera roughly
 * 100x too far away even at "minimum" distance. Applied uniformly regardless
 * of pitch level or whether a target is followed, so close zoom always works
 * the same way ("zoom in all the way to the center of rotation").
 */
const MIN_DISTANCE_ACTIVE = 0.02;

/**
 * Distance the camera eases to when following/pitch is switched off — a
 * fixed, sane "overview" distance, deliberately independent of whatever zoom
 * level the user happened to be at while following. Reusing that leftover
 * distance was the bug: easing the *target* from the followed point back to
 * the globe center while preserving the camera's *offset* from it dragged
 * the camera along too, and if the user had zoomed in tight while following,
 * the camera would end up clipped into (or right at) the globe surface.
 */
const EXIT_VIEW_DISTANCE = 2.4;

/** Hard cap on the exit transition's duration — see exitElapsed below. */
const MAX_EXIT_SECONDS = 2.5;

/**
 * Rotate/pan drag sensitivity, scaled by zoom distance (see the comment where
 * these are applied in useFrame). OrbitControls maps a given drag distance to
 * a fixed angle regardless of how close the camera is to its target, so
 * without this a drag near the surface swings the view across a huge amount
 * of ground compared to the same drag zoomed out.
 */
const BASE_ROTATE_SPEED = 0.45;
const MIN_ROTATE_SPEED = 0.2;
const BASE_PAN_SPEED = 0.5;
const MIN_PAN_SPEED = 0.05;
/** Distance at/above which rotate/pan speed is the unscaled base value. */
const ROTATE_SLOWDOWN_DISTANCE = 1.5;

/** Camera distance at slider value 1 (fully zoomed out). */
const MAX_DISTANCE = 3.5;

interface CameraRigProps {
  followedId: string | null;
  positions: Map<string, THREE.Vector3>;
  /**
   * 0 = classic globe orbit (near top-down, world-up). Towards 1 the camera
   * tilts down to the local horizon — the earth's surface becomes level in
   * frame and aircraft are seen from the side.
   */
  pitch: number;
  /**
   * External zoom request from the vertical slider control: 0 (fully zoomed
   * in, at whichever minDistance floor currently applies) to 1 (fully zoomed
   * out, MAX_DISTANCE). `null` when the slider isn't being actively dragged —
   * the camera is otherwise free to zoom via wheel/pinch without the slider
   * fighting it every frame. `nonce` increments on every slider input so the
   * effect re-fires even if the mapped value is numerically unchanged.
   */
  zoomRequest: { value: number; nonce: number } | null;
}

/**
 * Orbit controls (zoom / pan / rotate) plus two authored behaviors:
 *
 * - **Follow**: the orbit target glides with the followed aircraft.
 * - **Pitch**: the camera's elevation above the *local* horizon of the
 *   orbited point is constrained, with the up vector pinned to that point's
 *   surface normal — so tilting down keeps the horizon level instead of
 *   rolling the view sideways. The base (pitch=0) elevation itself eases
 *   from steep to shallow as the user zooms in (see FAR/NEAR_ELEVATION_DEG).
 *   Without a followed target, the pivot is captured once — via a
 *   screen-center raycast against the globe — the moment pitch first
 *   engages, and held fixed from then on (so it doesn't wander frame to
 *   frame; see pitchAnchor below).
 *
 * Both are applied as **pure translation** (follow: move camera + target by
 * the identical delta) and **pure rotation** (pitch: rotate the existing
 * camera↔target offset toward the desired elevation, preserving its length)
 * — neither operation can change the orbit *distance*. Critically, this runs
 * at render-priority -2, strictly *before* drei's own OrbitControls update
 * (priority -1): drei's update is the only thing that ever applies zoom/pan/
 * rotate and writes the frame's final camera position, using our adjusted
 * target/offset as its input. Calling `controls.update()` a second time
 * ourselves after that (an earlier approach) fought drei's own zoom
 * bookkeeping and made zooming in while following effectively impossible.
 */
export function CameraRig({
  followedId,
  positions,
  pitch,
  zoomRequest,
}: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const wasActive = useRef(false);
  // Last-seen zoomRequest.nonce: distinguishes "slider still at the same
  // value as last frame" (apply nothing further, so wheel/pinch can take
  // back over) from "slider just moved" (ease toward the new value).
  const lastZoomNonce = useRef<number | null>(null);
  // Captured once, the instant follow/pitch switches off: the direction
  // (from the globe center) straight through wherever the target was at that
  // moment. The exit transition pans the camera toward this direction, at a
  // fixed EXIT_VIEW_DISTANCE snapped once up front (see below) — not eased
  // toward, since easing distance over the transition previously meant any
  // zoom the user did mid-transition got fought/undone every frame for the
  // whole ~1-2s duration (it felt like zoom was disabled right after
  // stopping follow/pitch).
  const exitDirection = useRef<THREE.Vector3 | null>(null);
  // Safety net: guarantees the pan always terminates even if target/direction
  // convergence never quite satisfies the completion check.
  const exitElapsed = useRef(0);
  // Pitch-without-follow pivot: captured once (screen-center raycast against
  // the globe) the moment pitch engages with no followed target, then held
  // fixed — orbiting/zooming continues to pivot around this same point
  // rather than being re-derived (and potentially drifting) every frame.
  // Cleared whenever a target is followed or pitch returns to 0.
  const pitchAnchor = useRef<THREE.Vector3 | null>(null);

  useFrame(({ camera }, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // Exponential smoothing that is frame-rate independent.
    const k = 1 - Math.exp(-5 * Math.min(delta, 0.1));

    const followed = followedId ? positions.get(followedId) : undefined;
    const active = Boolean(followed) || pitch > 0.001;

    // OrbitControls maps a drag gesture to a fixed *angle* of rotation
    // regardless of zoom distance — that angle sweeps a tiny arc-length of
    // ground when zoomed out, but the same angle sweeps a huge arc-length up
    // close (rotating "around" a point 0.02 units away covers much more
    // relative ground per degree than rotating around a point 3 units away).
    // Scale rotateSpeed down as the camera nears whichever minDistance floor
    // is in play — the default (inactive) orbit floor is MUCH farther out
    // than the active (follow/pitch) floor, so anchoring this to the active
    // floor alone left default-mode close zoom (target = globe center)
    // barely slowed down at all, even though the camera can still get right
    // down to the surface there too.
    const currentRadius = camera.position.distanceTo(controls.target);
    const activeFloor = active ? MIN_DISTANCE_ACTIVE : MIN_DISTANCE;
    const rotateProximity = THREE.MathUtils.clamp(
      (ROTATE_SLOWDOWN_DISTANCE - currentRadius) /
        (ROTATE_SLOWDOWN_DISTANCE - activeFloor),
      0,
      1,
    );
    controls.rotateSpeed = THREE.MathUtils.lerp(
      BASE_ROTATE_SPEED,
      MIN_ROTATE_SPEED,
      rotateProximity,
    );
    controls.panSpeed = THREE.MathUtils.lerp(
      BASE_PAN_SPEED,
      MIN_PAN_SPEED,
      rotateProximity,
    );

    // Vertical zoom slider: eases the camera along its *current* view
    // direction (camera→target) toward the radius the slider maps to, only
    // while the slider is actively being dragged (a fresh nonce each frame
    // it moves). Once the user releases it (nonce stops changing), this
    // stops touching radius entirely so wheel/pinch zoom immediately regains
    // full control — mirrors how the exit transition avoids fighting
    // concurrent zoom input.
    if (zoomRequest && zoomRequest.nonce !== lastZoomNonce.current) {
      lastZoomNonce.current = zoomRequest.nonce;
      const floor = active ? MIN_DISTANCE_ACTIVE : MIN_DISTANCE;
      const targetRadius = THREE.MathUtils.lerp(
        floor,
        MAX_DISTANCE,
        THREE.MathUtils.clamp(zoomRequest.value, 0, 1),
      );
      scratchOffset.copy(camera.position).sub(controls.target);
      const currentZoomRadius = scratchOffset.length();
      if (currentZoomRadius > 1e-5) {
        scratchOffset.normalize().multiplyScalar(targetRadius);
        camera.position.copy(controls.target).add(scratchOffset);
      }
    }

    if (!active) {
      controls.minDistance = MIN_DISTANCE;
      pitchAnchor.current = null;
      // Ease back to a centered globe orbit, panning overhead wherever the
      // target last was — distance snaps to EXIT_VIEW_DISTANCE immediately
      // (once, below) and is never touched again during the pan, so zoom
      // stays fully responsive the instant follow/pitch is switched off.
      if (wasActive.current) {
        if (!exitDirection.current) {
          exitDirection.current = (
            controls.target.lengthSq() > 1e-6 ? controls.target : camera.position
          )
            .clone()
            .normalize();
          exitElapsed.current = 0;
          camera.position
            .copy(exitDirection.current)
            .multiplyScalar(EXIT_VIEW_DISTANCE);
        }
        exitElapsed.current += delta;
        const timedOut = exitElapsed.current > MAX_EXIT_SECONDS;

        const oldTarget = scratchOldTarget.copy(controls.target);
        controls.target.lerp(ORIGIN, k);
        // Translate by the target's own movement first, so whatever radius
        // currently exists — including any zoom the user just did — carries
        // through untouched; only the *direction* component below eases.
        camera.position.add(scratchDelta.copy(controls.target).sub(oldTarget));

        scratchOffset.copy(camera.position).sub(controls.target);
        const radius = Math.max(scratchOffset.length(), MIN_DISTANCE);
        let aligned = false;
        if (scratchOffset.lengthSq() > 1e-10) {
          scratchOffset.normalize();
          aligned = scratchOffset.dot(exitDirection.current) > 0.99999;
          if (!(timedOut || aligned)) {
            scratchOffset.lerp(exitDirection.current, k).normalize();
          } else {
            scratchOffset.copy(exitDirection.current);
          }
          camera.position
            .copy(controls.target)
            .addScaledVector(scratchOffset, radius);
        }
        camera.up.lerp(WORLD_Y, k).normalize();

        const settled = controls.target.lengthSq() < 1e-6 && aligned;
        if (settled || timedOut) {
          controls.target.copy(ORIGIN);
          camera.up.copy(WORLD_Y);
          wasActive.current = false;
          exitDirection.current = null;
        }
      }
      return;
    }
    wasActive.current = true;
    exitDirection.current = null;

    // Anchor: the followed aircraft, or a fixed pivot on the globe surface.
    if (followed) {
      scratchAnchor.copy(followed);
      pitchAnchor.current = null;

      // 1) Follow: translate camera + target by the identical delta. A pure
      // translation preserves the offset (and hence zoom distance) exactly —
      // it cannot interact with OrbitControls' own zoom scale. Needed here
      // because the anchor moves continuously (the aircraft is flying) and
      // the camera must chase it.
      const oldTarget = scratchOldTarget.copy(controls.target);
      controls.target.lerp(scratchAnchor, k);
      scratchDelta.copy(controls.target).sub(oldTarget);
      camera.position.add(scratchDelta);
    } else {
      const firstEngage = !pitchAnchor.current;
      if (firstEngage) {
        // Capture once: raycast from the camera through the screen center
        // (its actual current forward direction) to find exactly what the
        // user is looking at on the globe right now, so the pivot matches
        // "wherever the middle of my screen intersects the globe" instead
        // of some indirectly-inferred, potentially stale point.
        camera.getWorldDirection(scratchForwardDir);
        if (
          !raySphereNear(camera.position, scratchForwardDir, GLOBE_RADIUS, scratchHitPoint)
        ) {
          scratchHitPoint.copy(camera.position).normalize().multiplyScalar(GLOBE_RADIUS);
        }
        pitchAnchor.current = scratchHitPoint.clone();
      }
      scratchAnchor.copy(pitchAnchor.current!);

      // The pivot sits exactly on the camera's current line of sight (by
      // construction of the raycast above), so retargeting to it — with the
      // camera left untouched — is a zero-visual-change operation: nothing
      // pans or snaps, and the new camera↔target offset is *automatically*
      // the true distance to that surface point (previously, distance to the
      // globe *center*). Translating the delta instead (as follow does)
      // would drag the camera along too, which preserves the old
      // center-relative distance at the surface-relative pivot — the exact
      // "unwanted zoom out" bug this replaces: the same radius suddenly reads
      // as much farther away once measured from a near-surface point instead
      // of the globe center. No lerp is needed since there's nothing to ease
      // toward — pitchAnchor never moves again once captured.
      if (firstEngage) {
        controls.target.copy(scratchAnchor);
      }
    }

    // 2) Pitch: rotate the existing offset toward the desired elevation
    // above the local horizon. The reference "up" reused here is the
    // camera's own (already-eased) up vector, rather than a fresh, un-eased
    // direction recomputed from the target every frame — using two
    // different "up"s (an eased one for camera.up, an instant one for the
    // position math) was exactly what caused the camera to visibly snap the
    // instant pitch/follow engaged, instead of smoothly rotating from
    // whatever angle it already happened to be at.
    const desiredUp = scratchDesiredUp.copy(controls.target).normalize();
    camera.up.lerp(desiredUp, k).normalize();
    const up = scratchUp.copy(camera.up);

    scratchOffset.copy(camera.position).sub(controls.target);
    const radius = scratchOffset.length();
    if (radius > 1e-5) {
      scratchOffset.normalize();
      scratchHoriz
        .copy(scratchOffset)
        .addScaledVector(up, -scratchOffset.dot(up));
      if (scratchHoriz.lengthSq() < 1e-6) {
        // Looking straight down the normal — seed an arbitrary tangent.
        scratchHoriz.crossVectors(WORLD_Y, up);
        if (scratchHoriz.lengthSq() < 1e-6) scratchHoriz.set(1, 0, 0);
      }
      scratchHoriz.normalize();

      // Base elevation eases from steep (far) to shallow (near) with zoom —
      // see the FAR/NEAR_ELEVATION_DEG comment above.
      const proximity = THREE.MathUtils.clamp(
        (FAR_ELEVATION_DISTANCE - radius) / (FAR_ELEVATION_DISTANCE - MIN_DISTANCE_ACTIVE),
        0,
        1,
      );
      const baseElevationDeg = THREE.MathUtils.lerp(
        FAR_ELEVATION_DEG,
        NEAR_ELEVATION_DEG,
        proximity,
      );
      const elevation = THREE.MathUtils.degToRad(
        baseElevationDeg - pitch * (baseElevationDeg - MIN_ELEVATION_DEG),
      );
      scratchDesired
        .copy(up)
        .multiplyScalar(Math.sin(elevation))
        .addScaledVector(scratchHoriz, Math.cos(elevation));

      scratchOffset.lerp(scratchDesired, k).normalize().multiplyScalar(radius);
      camera.position.copy(controls.target).add(scratchOffset);
    }

    // Active (following and/or pitched) always uses the tight, near-surface
    // floor — see MIN_DISTANCE_ACTIVE — regardless of pitch level, so zoom
    // can always reach all the way in to the pivot.
    controls.minDistance = MIN_DISTANCE_ACTIVE;
    // No controls.update() here — drei's own OrbitControls update (priority
    // -1) runs right after this and is the sole authority on the final
    // camera position, applying any pending zoom/pan/rotate on top of the
    // target/offset we just adjusted.
  }, -2);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={BASE_ROTATE_SPEED}
      zoomSpeed={0.7}
      panSpeed={BASE_PAN_SPEED}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
    />
  );
}
