import { expect, test } from '@playwright/test';

import { waitForAppHydration } from './helpers';

test('desktop navigation and listings filtering work across browser engines', async ({ page }) => {
  await page.goto('/about');
  await waitForAppHydration(page);
  await page.getByRole('link', { name: 'Search Active Listings' }).click();
  await expect(page).toHaveURL(/\/listings$/);

  await expect(page.getByRole('heading', { name: 'Search Active Listings' })).toBeVisible();
  const filterButton = page.getByRole('button', { name: 'Advanced Filter' });
  await expect(filterButton).toBeVisible();
  await waitForAppHydration(page);
  await filterButton.click();
  const minBedrooms = page.getByLabel('Min Bedrooms');
  await expect(minBedrooms).toBeVisible();
  await minBedrooms.fill('2');
  await page.getByRole('button', { name: 'View Properties' }).click();

  await expect
    .poll(() => {
      const bedrooms = new URL(page.url()).searchParams.get('bedrooms');
      return bedrooms ? JSON.parse(bedrooms).min : null;
    })
    .toBe(2);
  await expect(page.locator('h2').filter({ hasText: /Search Results/ })).toBeVisible();
});
