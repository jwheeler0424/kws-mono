import { useSyncExternalStore } from 'react';

type DeviceSizeSnapshot = {
  size: { width: number; height: number };
  isPortrait: boolean;
};

const isServer = typeof window === 'undefined';

function buildSnapshot(): DeviceSizeSnapshot {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return { size: { width, height }, isPortrait: width <= height };
}

// Module-level store — one listener, shared across all hook instances.
let snapshot: DeviceSizeSnapshot = isServer
  ? { size: { width: 0, height: 0 }, isPortrait: false }
  : buildSnapshot();

const subscribers = new Set<() => void>();
let rafId: number | null = null;

function onResize() {
  if (rafId !== null) {
    return;
  }
  rafId = requestAnimationFrame(() => {
    rafId = null;
    const next = buildSnapshot();
    if (
      next.size.width !== snapshot.size.width ||
      next.size.height !== snapshot.size.height ||
      next.isPortrait !== snapshot.isPortrait
    ) {
      snapshot = next;
      for (const cb of subscribers) {
        cb();
      }
    }
  });
}

function subscribe(onStoreChange: () => void) {
  if (isServer) {
    return () => {};
  }

  if (subscribers.size === 0) {
    window.addEventListener('resize', onResize);
  }

  subscribers.add(onStoreChange);

  return () => {
    subscribers.delete(onStoreChange);
    if (subscribers.size === 0) {
      window.removeEventListener('resize', onResize);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }
  };
}

function getSnapshot() {
  return snapshot;
}

const SERVER_SNAPSHOT: DeviceSizeSnapshot = { size: { width: 0, height: 0 }, isPortrait: false };

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export const useDeviceSize = (): DeviceSizeSnapshot => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export default useDeviceSize;
