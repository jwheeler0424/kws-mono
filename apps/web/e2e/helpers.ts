import type { Page } from '@playwright/test';

export function waitForAppHydration(page: Page) {
  return page
    .waitForLoadState('networkidle')
    .then(() => page.waitForFunction(() => Object.hasOwn(globalThis, '__KWS_APP_ROUTER__')));
}
