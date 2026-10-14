import { expect, test } from '@playwright/test';

import { waitForAppHydration } from './helpers';

test('mobile navigation opens, navigates, and closes', async ({ page }) => {
  await page.goto('/about');
  await waitForAppHydration(page);

  const menuButton = page.getByRole('button', { name: 'Open navigation' });
  await expect(menuButton).toBeVisible();
  await menuButton.tap();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await page.getByRole('link', { name: 'Buying', exact: true }).click();
  await expect(page).toHaveURL(/\/buying$/);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('content pages do not overflow at phone, tablet, or desktop widths', async ({ page }) => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of ['/about', '/contact', '/buying']) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      const hasHorizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(hasHorizontalOverflow, `${path} at ${viewport.width}px`).toBe(false);
    }
  }
});
