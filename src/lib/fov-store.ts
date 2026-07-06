"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny external store bridging the 3D world and the React panels.
 *
 * The globe (inside the R3F render loop) publishes which aircraft are inside
 * the camera frustum a couple of times per second; dashboard panels subscribe
 * via useSyncExternalStore. Keeping this outside React state avoids routing
 * per-frame data through the component tree.
 */

export interface FovSnapshot {
  /** icao24 ids currently visible in the camera's FOV. */
  ids: string[];
  updatedAt: number;
}

const EMPTY: FovSnapshot = { ids: [], updatedAt: 0 };

let current: FovSnapshot = EMPTY;
const listeners = new Set<() => void>();

export function publishFov(ids: string[]): void {
  current = { ids, updatedAt: Date.now() };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => current;
const getServerSnapshot = () => EMPTY;

/** Subscribe to the set of aircraft currently in the camera's FOV. */
export function useFovSnapshot(): FovSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
