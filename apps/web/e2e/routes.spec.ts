import { expect, test } from '@playwright/test';

const publicRoutes = [
  { path: '/', heading: 'Kyle Weber, Seattle Real Estate at Compass' },
  { path: '/about', heading: 'About Me' },
  { path: '/buying', heading: 'Buying a Home in Seattle' },
  { path: '/selling', heading: 'Selling a Home in Seattle' },
  { path: '/contact', heading: 'Reach out to me.' },
  { path: '/blog', heading: "Let's Discover Seattle" },
  { path: '/properties', heading: 'Our Exclusive Listings' },
  { path: '/listings', heading: 'Search Active Listings' },
  { path: '/policies/privacy', heading: 'Privacy Policy' },
  { path: '/policies/dmca', heading: 'DMCA Policy' },
];

for (const route of publicRoutes) {
  test(`${route.path} renders its primary content`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const response = await page.goto(route.path);

    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('main').first()).toBeVisible();
    await expect(page.locator('h1').first()).toContainText(route.heading);
    expect(pageErrors).toEqual([]);
  });
}
