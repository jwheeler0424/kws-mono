import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 480;
const TABLET_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1120;

type DeviceSnapshot = {
  isMobile: boolean;
  isTablet: boolean;
  isPortrait: boolean;
};

const isServer = typeof window === 'undefined';

function buildSnapshot(): DeviceSnapshot {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    isMobile: w < MOBILE_BREAKPOINT,
    isTablet: w >= TABLET_BREAKPOINT && w < DESKTOP_BREAKPOINT,
    isPortrait: w <= h,
  };
}

// Module-level store — one listener, shared across all hook instances.
let snapshot: DeviceSnapshot = isServer
  ? { isMobile: false, isTablet: false, isPortrait: false }
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
      next.isMobile !== snapshot.isMobile ||
      next.isTablet !== snapshot.isTablet ||
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

const SERVER_SNAPSHOT: DeviceSnapshot = { isMobile: false, isTablet: false, isPortrait: false };

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

export function useDetectDevice(): DeviceSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
