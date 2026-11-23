import { expect, test } from '@playwright/test';

test('Paste a Link keeps URL entry and the parcel world with three distinct tabs', async ({ page }, testInfo) => {
  const privateRequests: string[] = []; const errors: string[] = [];
  page.on('request', (request) => { if (/\/api\/purchases/.test(request.url())) privateRequests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(nav.getByRole('link')).toHaveText(['Paste a Link', 'Discover Korea', 'How It Works']);
  await expect(nav.getByRole('link', { name: 'Paste a Link' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/From Korea\s*to your door\./);
  await expect(page.getByText('New request', { exact: true })).toHaveCount(0);
  await expect(page.getByText('My requests', { exact: true })).toHaveCount(0);
  await expect(page.locator('.discovery-card, .product-card')).toHaveCount(0);
  await expect(page.getByLabel('Product link', { exact: true })).toBeVisible();
  await expect(page.locator('.parcel-world')).toBeVisible();
  await expect(page.locator('.parcel-faq')).toHaveCount(0);
  // CSS pixels avoid oversized GPU tiles in full-page mobile evidence at DPR 3.
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true, scale: 'css' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(privateRequests).toEqual([]); expect(errors).toEqual([]);
});

test('Discover Korea selects MD merchandise without URL entry and retains destination', async ({ page }, testInfo) => {
  await page.goto('/products');
  await expect(page.locator('.product-card')).toHaveCount(4);
  await expect(page.locator('input[type="url"]')).toHaveCount(0);
  await expect(page.getByLabel('Product link', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Start with a product link/ })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('discover.png'), fullPage: true, scale: 'css' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Search Korean finds').fill('ICONIC');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByLabel('Shopping destination').selectOption('JP');
  await page.locator('.product-card .product-actions button').click();
  await expect(page).toHaveURL(/\/purchase$/);
  await expect(page.getByLabel('Product link', { exact: true })).toHaveValue('https://www.yes24.com/product/goods/89376511');
  await expect(page.getByLabel('Destination country', { exact: true })).toHaveValue('JP');
});

test('metadata icon serves SVG for both reported query variants', async ({ request }) => {
  for (const suffix of ['?593e6a3e4733b552', '?593e6a3e4733b552=']) {
    const response = await request.get('/icon.svg' + suffix);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/svg+xml');
    expect(await response.text()).toContain('<svg');
  }
});

test('URL intake preserves destination without calling private guest APIs', async ({ page }) => {
  const privateRequests: string[] = []; const errors: string[] = [];
  page.on('request', (request) => { if (/\/api\/purchases/.test(request.url())) privateRequests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Shopping destination').selectOption('CN');
  await page.getByLabel('Product link', { exact: true }).fill('https://www.yes24.com/product/goods/109196213');
  await page.getByRole('button', { name: 'Continue', exact: false }).click();
  await expect(page.getByLabel('Destination country', { exact: true })).toHaveValue('CN');
  expect(privateRequests).toEqual([]); expect(errors).toEqual([]);
});

test('How It Works combines the buying journey and shipping/returns and preserves the old guide URL', async ({ page, request }, testInfo) => {
  await page.goto('/products');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'How It Works' }).click();
  await expect(page).toHaveURL(/\/guides\/how-it-works$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How It Works');
  await expect(page.locator('#buying .parcel-step')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'Your costs before payment' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cancellation, returns and damaged goods' })).toBeVisible();
  await expect(page.getByText(/Combined shipping is not currently available to book/)).toBeVisible();
  await expect(page.getByText(/Refunds after payment cannot be processed automatically yet/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('guide.png'), fullPage: true, scale: 'css' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const legacy = await request.get('/guides/shipping-and-returns', { maxRedirects: 0 });
  expect(legacy.status()).toBe(307);
  expect(legacy.headers().location).toBe('/guides/how-it-works#shipping-and-returns');
  await page.goto('/guides/shipping-and-returns');
  await expect(page).toHaveURL(/\/guides\/how-it-works#shipping-and-returns$/);
});

test('catalog search is bookmarkable and guidance does not claim verified prices', async ({ page }) => {
  await page.goto('/products');
  await page.getByLabel('Search Korean finds').fill('ICONIC');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=ICONIC/);
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('Search Korean finds')).toHaveValue('ICONIC');
  await expect(page.getByText(/No duties-included offer is confirmed here/)).toBeVisible();
});

test.describe('initial studio view', () => {
  test.use({ javaScriptEnabled: false });
  test('shows the rendered 3D poster before any JavaScript or WebGL runs', async ({ page }) => {
    await page.goto('/');
    const poster = page.locator('.parcel-world-fallback img');
    await expect(poster).toBeVisible();
    await expect(poster).toHaveAttribute('src', '/images/parcel-studio-poster.webp');
    expect(await poster.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 848)).toBe(true);
    await expect(page.locator('.parcel-world-canvas canvas')).toHaveCount(0);
    await expect(page.getByLabel('Product link', { exact: true })).toBeEditable();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
