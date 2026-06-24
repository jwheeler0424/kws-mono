import { useSyncExternalStore } from 'react';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';
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

function readSystemPrefersDark() {
  return getMediaQuery()?.matches ?? false;
}

function subscribeSystemPrefersDark(onStoreChange: () => void) {
  const media = getMediaQuery();

  if (!media) {
    return () => {};
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onStoreChange);

    return () => {
      media.removeEventListener('change', onStoreChange);
    };
  }

  media.addListener(onStoreChange);

  return () => {
    media.removeListener(onStoreChange);
  };
}
export function useSystemTheme() {
  const prefersDark = useSyncExternalStore(
    subscribeSystemPrefersDark,
    readSystemPrefersDark,
    () => false,
  );

  const systemTheme: 'light' | 'dark' = prefersDark ? 'dark' : 'light';

  return { systemTheme, systemPrefersDark: prefersDark };
}
