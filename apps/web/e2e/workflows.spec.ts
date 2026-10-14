import { expect, test } from '@playwright/test';

import { waitForAppHydration } from './helpers';

async function readResultsCount(page: import('@playwright/test').Page) {
  const heading = page
    .locator('h2')
    .filter({ hasText: /Search Results/ })
    .first();
  await expect(heading).toBeVisible();
  await expect
    .poll(async () => {
      const text = await heading.innerText();
      if (text.match(/\(([\d,]+)\)/)) {
        return true;
      }

      return page.getByText('There are currently no results to view.').isVisible();
    })
    .toBe(true);

  const text = await heading.innerText();
  const count = text.match(/\(([\d,]+)\)/)?.[1];
  return count ? Number(count.replaceAll(',', '')) : 0;
}

async function openAdvancedFilters(page: import('@playwright/test').Page) {
  await waitForAppHydration(page);
  await page.getByRole('button', { name: 'Advanced Filter' }).click();
  await expect(page.getByLabel('Min Bedrooms')).toBeVisible();
}

test('contact form validates invalid input without submitting it', async ({ page }) => {
  const submissions: string[] = [];
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      submissions.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.continue();
  });

  await page.goto('/contact');
  await waitForAppHydration(page);
  await page.getByLabel('Name').fill('Taylor Buyer');
  const emailInput = page.getByLabel('Email');
  await emailInput.fill('not-an-email');
  await page.getByLabel('Phone').fill('2065550100');
  await page.getByLabel('Message').fill('Please contact me.');
  expect(
    await emailInput.evaluate((input) => (input as HTMLInputElement).validity.typeMismatch),
  ).toBe(true);
  await page.getByRole('button', { name: 'Send message' }).click();

  expect(submissions).toEqual([]);
  await expect(emailInput).toHaveValue('not-an-email');
});

test('contact form rejects invalid phone input without submitting it', async ({ page }) => {
  const submissions: string[] = [];
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      submissions.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.continue();
  });

  await page.goto('/contact');
  await waitForAppHydration(page);
  await page.getByLabel('Name').fill('Taylor Buyer');
  await page.getByLabel('Email').fill('buyer@example.test');
  await page.getByLabel('Phone').fill('not-a-phone');
  await page.getByLabel('Message').fill('Please contact me.');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByText('Please enter a valid phone number')).toBeVisible();
  expect(submissions).toEqual([]);
});

test('contact form submits the expected payload and resets after success', async ({ page }) => {
  const submissions: unknown[] = [];
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      submissions.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: { success: true, message: 'Contact request submitted successfully' },
        }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/contact');
  await waitForAppHydration(page);
  await page.getByLabel('Name').fill('Taylor Buyer');
  await page.getByLabel('Email').fill('buyer@example.test');
  await page.getByLabel('Phone').fill('2065550100');
  await page.getByLabel('Message').fill('Please contact me.');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByText('Your message has been sent successfully')).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(JSON.stringify(submissions[0])).toContain('buyer@example.test');
  await expect(page.getByLabel('Name')).toHaveValue('');
  await expect(page.getByLabel('Message')).toHaveValue('');
});

test('contact form preserves values and allows retry after a server failure', async ({ page }) => {
  const submissions: string[] = [];
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST') {
      submissions.push(route.request().url());
      await route.fulfill({
        status: 500,
        contentType: 'text/plain',
        body: 'Test contact service failure',
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/contact');
  await waitForAppHydration(page);
  await page.getByLabel('Name').fill('Taylor Buyer');
  await page.getByLabel('Email').fill('buyer@example.test');
  await page.getByLabel('Phone').fill('2065550100');
  await page.getByLabel('Message').fill('Please contact me.');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(
    page.getByText('There was an error submitting your request. Please try again later.'),
  ).toBeVisible();
  expect(submissions).toHaveLength(1);
  await expect(page.getByLabel('Name')).toHaveValue('Taylor Buyer');
  await expect(page.getByLabel('Message')).toHaveValue('Please contact me.');
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
});

test('unknown routes show the not-found recovery actions', async ({ page }) => {
  await page.goto('/this-route-should-not-exist');

  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home', exact: true }).last()).toHaveAttribute(
    'href',
    '/',
  );
});

test('advanced filters and keyword search stay combined as results update', async ({ page }) => {
  await page.goto('/listings');
  const baselineCount = await readResultsCount(page);

  await openAdvancedFilters(page);
  await page.getByLabel('Min Bedrooms').fill('4');
  await page.getByRole('button', { name: 'View Properties' }).click();
  await expect(page).toHaveURL(/bedrooms=/);
  const fourBedroomCount = await readResultsCount(page);
  expect(fourBedroomCount).toBeLessThanOrEqual(baselineCount);

  const searchInput = page.getByRole('textbox', { name: 'Search property listings...' });
  await searchInput.fill('Ballard');
  await expect(page).toHaveURL(/query=Ballard/);
  await expect.poll(() => readResultsCount(page)).toBeLessThan(fourBedroomCount);
  const combinedCount = await readResultsCount(page);

  await openAdvancedFilters(page);
  await page.getByLabel('Min Bedrooms').fill('2');
  await page.getByRole('button', { name: 'View Properties' }).click();
  await expect(page).toHaveURL(/query=Ballard/);
  await expect
    .poll(() => {
      const url = new URL(page.url());
      const bedrooms = url.searchParams.get('bedrooms');
      return bedrooms ? JSON.parse(bedrooms).min : null;
    })
    .toBe(2);
  await expect.poll(() => readResultsCount(page)).toBeGreaterThanOrEqual(combinedCount);
});

test('deep-linked filters survive reload and browser back/forward navigation', async ({ page }) => {
  const bedroomsFour = encodeURIComponent(JSON.stringify({ min: 4, max: null }));
  await page.goto(`/listings?bedrooms=${bedroomsFour}`);
  const fourBedroomCount = await readResultsCount(page);

  await openAdvancedFilters(page);
  await expect(page.getByLabel('Min Bedrooms')).toHaveValue('4');
  await page.getByLabel('Min Bedrooms').fill('2');
  await page.getByRole('button', { name: 'View Properties' }).click();
  await expect
    .poll(() => {
      const bedrooms = new URL(page.url()).searchParams.get('bedrooms');
      return bedrooms ? JSON.parse(bedrooms).min : null;
    })
    .toBe(2);
  const twoBedroomCount = await readResultsCount(page);
  expect(twoBedroomCount).toBeGreaterThanOrEqual(fourBedroomCount);

  await page.goBack();
  await expect
    .poll(() => {
      const bedrooms = new URL(page.url()).searchParams.get('bedrooms');
      return bedrooms ? JSON.parse(bedrooms).min : null;
    })
    .toBe(4);
  await expect.poll(() => readResultsCount(page)).toBe(fourBedroomCount);

  await page.goForward();
  await expect
    .poll(() => {
      const bedrooms = new URL(page.url()).searchParams.get('bedrooms');
      return bedrooms ? JSON.parse(bedrooms).min : null;
    })
    .toBe(2);
  await expect.poll(() => readResultsCount(page)).toBe(twoBedroomCount);
});

test('map-bounds filtering follows viewport changes and clears when disabled', async ({ page }) => {
  await page.goto('/listings');
  const baselineCount = await readResultsCount(page);
  await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();

  await openAdvancedFilters(page);
  await page.getByRole('checkbox', { name: 'Restrict properties to map view' }).check();
  await page.getByRole('button', { name: 'View Properties' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has('bounds')).toBe(true);
  const firstBounds = new URL(page.url()).searchParams.get('bounds');
  expect(new URL(page.url()).searchParams.get('useMapBounds')).toBe('true');
  expect(JSON.parse(firstBounds ?? 'null')).toHaveProperty('northEast');
  expect(await readResultsCount(page)).toBeLessThanOrEqual(baselineCount);

  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('bounds')).not.toBe(firstBounds);

  await openAdvancedFilters(page);
  await page.getByRole('checkbox', { name: 'Restrict properties to map view' }).uncheck();
  await page.getByRole('button', { name: 'View Properties' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has('bounds')).toBe(false);
  await expect.poll(() => new URL(page.url()).searchParams.has('useMapBounds')).toBe(false);
});

test('advanced filters support keyboard opening, focus, and Escape dismissal', async ({ page }) => {
  await page.goto('/listings');
  await waitForAppHydration(page);

  const filterButton = page.getByRole('button', { name: 'Advanced Filter' });
  await filterButton.focus();
  await page.keyboard.press('Enter');

  const filterDialog = page.getByRole('dialog', { name: 'Property Filters' });
  await expect(filterDialog).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await filterDialog.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(filterDialog).not.toBeVisible();
});

test('scrolling loads another unique page of property results', async ({ page }) => {
  const hydrationFunctionId = Buffer.from(
    JSON.stringify({
      file: '/src/features/mls/functions/listings.ts?tss-serverfn-split',
      export: 'getHydratedListingsPaginatedServerFn_createServerFn_handler',
    }),
  )
    .toString('base64')
    .replace(/=+$/, '');
  const hydrationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes(hydrationFunctionId)) {
      hydrationRequests.push(request.postData() ?? '');
    }
  });

  await page.goto('/listings');
  const resultHeading = page.getByRole('heading', { name: /Search Results/ });
  await expect(resultHeading).toBeVisible();
  const listingLinks = page.locator('a[href^="/listings/"]');
  await expect.poll(() => listingLinks.count()).toBeGreaterThan(0);

  const scrollViewport = page.locator('[data-slot="scroll-area-viewport"]');
  await resultHeading.scrollIntoViewIfNeeded();
  await scrollViewport.evaluate((viewport) => {
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'instant' });
  });

  await expect.poll(() => hydrationRequests.some((body) => body.includes('"s":"48"'))).toBe(true);
  const loadedLinks = await listingLinks.evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).href),
  );
  expect(loadedLinks.length).toBeGreaterThan(0);
  expect(new Set(loadedLinks).size).toBe(loadedLinks.length);
});

test('short and unmatched keywords do not lose active filters', async ({ page }) => {
  await page.goto('/listings');
  await openAdvancedFilters(page);
  await page.getByLabel('Min Bedrooms').fill('2');
  await page.getByRole('button', { name: 'View Properties' }).click();
  await expect
    .poll(() => {
      const bedrooms = new URL(page.url()).searchParams.get('bedrooms');
      return bedrooms ? JSON.parse(bedrooms).min : null;
    })
    .toBe(2);
  const filteredCount = await readResultsCount(page);

  const searchInput = page.getByRole('textbox', { name: 'Search property listings...' });
  await searchInput.fill('ab');
  await expect(searchInput).toHaveAttribute('data-state', 'settled');
  await expect.poll(() => new URL(page.url()).searchParams.has('query')).toBe(false);
  expect(await readResultsCount(page)).toBe(filteredCount);

  await searchInput.fill('unlikelysearchterm987654321');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('query'))
    .toBe('unlikelysearchterm987654321');
  await expect(page.getByText('No listings found')).toBeVisible();

  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has('query')).toBe(false);
  await expect
    .poll(() => {
      const bedrooms = new URL(page.url()).searchParams.get('bedrooms');
      return bedrooms ? JSON.parse(bedrooms).min : null;
    })
    .toBe(2);
  await expect.poll(() => readResultsCount(page)).toBe(filteredCount);
});

test('clearing an applied range back to Any restores the unfiltered results', async ({ page }) => {
  await page.goto('/listings');
  const baselineCount = await readResultsCount(page);

  await openAdvancedFilters(page);
  await page.getByLabel('Min Bedrooms').fill('4');
  await page.getByRole('button', { name: 'View Properties' }).click();
  await expect
    .poll(() => {
      const bedrooms = new URL(page.url()).searchParams.get('bedrooms');
      return bedrooms ? JSON.parse(bedrooms).min : null;
    })
    .toBe(4);
  expect(await readResultsCount(page)).toBeLessThanOrEqual(baselineCount);

  await openAdvancedFilters(page);
  await page.getByLabel('Min Bedrooms').fill('');
  await expect(page.getByLabel('Min Bedrooms')).toHaveValue('');
  await page.getByRole('button', { name: 'View Properties' }).click();

  await expect.poll(() => new URL(page.url()).searchParams.has('bedrooms')).toBe(false);
  await expect.poll(() => readResultsCount(page)).toBe(baselineCount);
});

test('rejects a below-minimum price while preserving the valid maximum', async ({ page }) => {
  await page.goto('/listings');
  const baselineCount = await readResultsCount(page);

  await openAdvancedFilters(page);
  const minPrice = page.getByLabel('Min Price');
  const maxPrice = page.getByLabel('Max Price');
  await maxPrice.fill('1500000');
  await minPrice.fill('9999');
  await minPrice.press('Tab');

  await expect(page.getByText(/Please enter a valid minimum price/).first()).toBeVisible();
  await expect(minPrice).toHaveValue('');
  await expect(maxPrice).toHaveValue('1,500,000');
  await page.getByRole('button', { name: 'View Properties' }).click();

  await expect
    .poll(() => {
      const price = new URL(page.url()).searchParams.get('price');
      return price ? JSON.parse(price) : null;
    })
    .toEqual({ min: null, max: 1500000 });
  expect(await readResultsCount(page)).toBeLessThanOrEqual(baselineCount);
});

test('clamps an inverted price range to an equal valid boundary', async ({ page }) => {
  await page.goto('/listings');
  await openAdvancedFilters(page);

  await page.getByLabel('Min Price').fill('600000');
  const maxPrice = page.getByLabel('Max Price');
  await maxPrice.fill('500000');
  await maxPrice.press('Tab');
  await expect(maxPrice).toHaveValue('600,000');
  await page.getByRole('button', { name: 'View Properties' }).click();

  await expect
    .poll(() => {
      const price = new URL(page.url()).searchParams.get('price');
      return price ? JSON.parse(price) : null;
    })
    .toEqual({ min: 600000, max: 600000 });
});

test('rejects maximum values above every configured range limit', async ({ page }) => {
  await page.goto('/listings');
  await openAdvancedFilters(page);

  const invalidMaximums = [
    { label: 'Max Price', value: '20000001', error: /valid maximum price/ },
    { label: 'Max Sq Ft', value: '10001', error: /valid maximum square footage/ },
    { label: 'Max Bedrooms', value: '12', error: /valid maximum bedroom count/ },
    { label: 'Max Bathrooms', value: '12', error: /valid maximum bathroom count/ },
  ];

  for (const invalidMaximum of invalidMaximums) {
    const input = page.getByLabel(invalidMaximum.label);
    await input.fill(invalidMaximum.value);
    await input.press('Tab');
    await expect(page.getByText(invalidMaximum.error).first()).toBeVisible();
    await expect(input).toHaveValue('');
  }
});

test('all advanced ranges apply together and Reset restores the baseline', async ({ page }) => {
  await page.goto('/listings');
  const baselineCount = await readResultsCount(page);

  await openAdvancedFilters(page);
  await page.getByLabel('Min Price').fill('500000');
  await page.getByLabel('Max Price').fill('1500000');
  await page.getByLabel('Min Sq Ft').fill('1000');
  await page.getByLabel('Max Sq Ft').fill('5000');
  await page.getByLabel('Min Bedrooms').fill('2');
  await page.getByLabel('Max Bedrooms').fill('5');
  await page.getByLabel('Min Bathrooms').fill('1');
  await page.getByLabel('Max Bathrooms').fill('4');
  await page.getByRole('button', { name: 'View Properties' }).click();

  await expect.poll(() => new URL(page.url()).searchParams.has('price')).toBe(true);
  const searchParams = new URL(page.url()).searchParams;
  expect(JSON.parse(searchParams.get('price') ?? 'null')).toEqual({ min: 500000, max: 1500000 });
  expect(JSON.parse(searchParams.get('sqFt') ?? 'null')).toEqual({ min: 1000, max: 5000 });
  expect(JSON.parse(searchParams.get('bedrooms') ?? 'null')).toEqual({ min: 2, max: 5 });
  expect(JSON.parse(searchParams.get('bathrooms') ?? 'null')).toEqual({ min: 1, max: 4 });
  expect(await readResultsCount(page)).toBeLessThanOrEqual(baselineCount);

  await openAdvancedFilters(page);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page).toHaveURL(/\/listings$/);
  await expect.poll(() => readResultsCount(page)).toBe(baselineCount);
});

test('listing map controls respond and a result opens its detail page', async ({ page }) => {
  await page.goto('/listings');

  const zoomInButton = page.getByRole('button', { name: 'Zoom in', exact: true });
  const zoomOutButton = page.getByRole('button', { name: 'Zoom out', exact: true });
  await expect(zoomInButton).toBeVisible();
  await zoomInButton.click();
  await zoomOutButton.click();

  const firstListing = page.locator('a[href^="/listings/"]').first();
  await expect(firstListing).toBeVisible();
  await firstListing.click();
  await expect(page).toHaveURL(/\/listings\/[^/]+$/);
  await expect(page.locator('h1').first()).not.toBeEmpty();
});
