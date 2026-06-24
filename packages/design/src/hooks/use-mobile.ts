import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
let mobileMediaQuery: MediaQueryList | null = null;

function getMobileMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!mobileMediaQuery) {
    mobileMediaQuery = window.matchMedia(QUERY);
  }

  return mobileMediaQuery;
}

function subscribe(onStoreChange: () => void): () => void {
  const mql = getMobileMediaQuery();
  if (!mql) {
    return () => {};
  }

  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

function getSnapshot(): boolean {
  return getMobileMediaQuery()?.matches ?? false;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
