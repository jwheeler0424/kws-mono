import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const GSAP_REGISTRY_KEY = '__KWS_GSAP_REGISTRY__' as const;

type GsapRegistry = {
  isRegistered: boolean;
};

type GsapGlobalStore = {
  [GSAP_REGISTRY_KEY]?: unknown;
};

function getGsapRegistry(): GsapRegistry {
  const globals = globalThis as GsapGlobalStore;
  const existing = globals[GSAP_REGISTRY_KEY] as GsapRegistry | undefined;

  if (existing) {
    return existing;
  }

  const created: GsapRegistry = {
    isRegistered: false,
  };

  globals[GSAP_REGISTRY_KEY] = created;
  return created;
}

export function ensureGsapRegistered() {
  const registry = getGsapRegistry();

  if (registry.isRegistered) {
    return;
  }

  gsap.registerPlugin(ScrollTrigger, useGSAP);
  registry.isRegistered = true;
}

export function cleanupGsapForHotReload() {
  if (typeof window === 'undefined') {
    return;
  }

  ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true));
  gsap.globalTimeline.clear();
  ScrollTrigger.clearScrollMemory?.();
}
