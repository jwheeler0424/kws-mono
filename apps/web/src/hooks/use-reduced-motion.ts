import { useSyncExternalStore } from 'react';

const MEDIA_QUERY = '(prefers-reduced-motion: reduce)';
const isServer = typeof window === 'undefined';
let mediaQueryInstance: MediaQueryList | null = null;

function getMediaQuery() {
  if (isServer) {
    return null;
  }

  if (!mediaQueryInstance) {
    mediaQueryInstance = window.matchMedia(MEDIA_QUERY);
  }

  return mediaQueryInstance;
}

function readPrefersReducedMotion() {
  return getMediaQuery()?.matches ?? false;
}

function subscribePrefersReducedMotion(onStoreChange: () => void) {
  const media = getMediaQuery();

  if (!media) {
    return () => {};
  }

  media.addEventListener('change', onStoreChange);

  return () => {
    media.removeEventListener('change', onStoreChange);
  };
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribePrefersReducedMotion, readPrefersReducedMotion, () => false);
}

export default useReducedMotion;
