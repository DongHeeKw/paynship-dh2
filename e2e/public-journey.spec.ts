import { test, expect, chromium } from '@playwright/test';

test('a guest sees the approved service fee without guessed shipping or tax', async ({ page }) => {
  await page.goto('/purchase');
  await page.getByLabel('Product link', { exact: true }).fill('https://www.musinsa.com/products/123');
  await page.getByLabel('Destination country', { exact: true }).selectOption('JP');
  const costs = page.getByRole('region', { name: 'Before you place a request.' });
  await costs.getByLabel('Seller’s unit price in KRW (optional)').fill('100000');
  await expect(costs.locator('div').filter({ has: page.locator('dt', { hasText: /^PayNShip service fee$/ }) }).locator('dd')).toHaveText('₩15,000');
  await expect(costs.locator('.cost-subtotal dd')).toHaveText('₩115,000');
  await expect(costs.locator('.cost-total dd')).toHaveText('Not ready yet');
  await costs.getByLabel('Seller’s unit price in KRW (optional)').fill('20000');
  await page.getByLabel('Quantity', { exact: true }).fill('2');
  await expect(costs.locator('.cost-subtotal dd')).toHaveText('₩46,000');
  await expect(costs).toContainText('Based on the price you entered.');
  await page.getByLabel('Options', { exact: true }).fill('Blue, medium');
  await expect(costs.getByLabel('Seller’s unit price in KRW (optional)')).toHaveValue('');
});

test('all requested social options are visible and unconfigured providers stay inactive', async ({ page }) => {
  for (const route of ['/login', '/signup']) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Continue with Apple' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Continue with Naver' })).toBeDisabled();
  }
});

test('Naver email confirmation errors become guidance without exposing provider details', async ({ page }) => {
  await page.goto('/auth/callback?next=%2Fpurchase#error=access_denied&error_code=provider_email_needs_verification&error_description=sensitive-provider-message');
  await expect(page.getByRole('main')).toContainText('Check your email to finish signing in.');
  await expect(page.getByRole('main')).not.toContainText('sensitive-provider-message');
  await expect(page).toHaveURL(/\/login\?error=callback&next=%2Fpurchase$/);
});

test('a guest can prepare a product when WebGL is unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
      if (kind.startsWith('webgl') || kind === 'experimental-webgl') return null;
      return Reflect.apply(getContext, this, [kind, ...args]);
    } as typeof getContext;
  });
  await page.goto('/');
  await expect(page.locator('.parcel-world-fallback')).toBeVisible();
  await page.getByLabel('Product link', { exact: true }).fill('https://www.yes24.com/Product/Goods/123456');
  await page.getByRole('button', { name: 'Continue', exact: false }).click();
  await expect(page).toHaveURL(/\/purchase$/);
  await expect(page.locator('input[type="url"]')).toHaveValue('https://www.yes24.com/Product/Goods/123456');
  await expect(page.getByText('No account needed to explore')).toBeVisible();
  expect(errors.filter(message => /THREE|WebGL|context|BindToCurrentSequence/i.test(message))).toEqual([]);
});

test('guest explanations expose no private profile and preserve the sign-in destination', async ({ page }) => {
  const privateRequests: string[] = [];
  page.on('request', request => {
    if (/\/api\/(purchases|delivery-profile)/.test(request.url())) privateRequests.push(request.url());
  });
  await page.goto('/orders');
  await expect(page.getByText('Illustration · not a real request')).toBeVisible();
  await page.getByRole('link', { name: 'Delivery details', exact: true }).click();
  await expect(page.getByText('Field preview · nothing saved')).toBeVisible();
  await expect(page.locator('main input')).toHaveCount(0);
  await page.getByRole('link', { name: 'Sign in to continue' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fdelivery$/);
  await page.getByRole('navigation', { name: 'Account access' }).getByRole('link', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/signup\?next=%2Fsettings%2Fdelivery$/);
  expect(privateRequests).toEqual([]);
});

test('email signup validates password confirmation before contacting authentication', async ({ page }) => {
  const authRequests: string[] = [];
  page.on('request', request => {
    if (/\/auth\/v1\//.test(request.url())) authRequests.push(request.url());
  });
  await page.goto('/signup');
  await page.getByLabel('Email address').fill('example@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Sample-password-24');
  await page.getByLabel('Confirm password').fill('Different-password-24');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Create account with email' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('passwords don’t match');
  await expect(page.locator('main').getByRole('alert')).toBeFocused();
  expect(authRequests).toEqual([]);
});

test('the 3D scene stops with reduced motion and falls back after context loss', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.parcel-world.is-ready')).toBeVisible();
  await expect(page.getByRole('button', { name: /Turn parcel/ })).toHaveCount(0);
  const canvas = page.locator('.parcel-world-canvas canvas');
  const before = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * .8, bounds!.y + bounds!.height * .3);
  await page.waitForTimeout(300);
  expect(await canvas.screenshot()).toEqual(before);
  await canvas.evaluate(element => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('.parcel-world-fallback')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn parcel right' })).toHaveCount(0);
  await expect(page.getByLabel('Product link', { exact: true })).toBeEditable();
});

test('the parcel has restrained pointer depth and stops moving after the interaction', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('.parcel-world.is-ready canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(4200);
  const before = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * .8, bounds!.y + bounds!.height * .5);
  await page.waitForTimeout(900);
  const after = await canvas.screenshot();
  expect(after).not.toEqual(before);
  await page.waitForTimeout(300);
  expect(await canvas.screenshot()).toEqual(after);
});

test('customer pages share the homepage palette and shell', async ({ page }) => {
  for (const path of ['/products', '/purchase', '/orders', '/settings/delivery', '/login', '/signup', '/guides/buy-kpop-from-korea', '/developers']) {
    await page.goto(path);
    await expect(page.locator('.site-shell')).toHaveClass(/site-shell-themed/);
    await expect(page.locator('.site-shell')).toHaveCSS('background-color', 'rgb(255, 248, 237)');
    await expect(page.locator('.site-brand > svg')).toHaveCSS('background-color', 'rgb(36, 103, 237)');
    if (path === '/guides/buy-kpop-from-korea') {
      await expect(page.getByRole('link', { name: 'Prepare your first find' })).toHaveCSS('color', 'rgb(255, 255, 255)');
    }
  }
});

test('public screens fit small and large viewports', async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/', '/products', '/purchase', '/orders', '/settings/delivery', '/login', '/signup', '/guides/buy-kpop-from-korea', '/developers']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} at ${width}px`).toBe(true);
    }
  }
});

test('K-pop references prepare a real listing draft and disclose the service fee', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Request BTS Proof' })).toHaveCount(0);
  await expect(page.locator('a[href*="youtube.com"], a[href*="tiktok.com"]')).toHaveCount(0);
  await expect(page.getByText('15% service fee · no minimum', { exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Discover Korea', exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole('link', { name: 'Discover Korea', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find your next favourite.');
  const photos = page.locator('.product-photo img');
  await expect(photos).toHaveCount(4);
  await expect.poll(() => photos.evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 100))).toBe(true);
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('kpop');
  await page.getByRole('button', { name: 'Request BTS Proof' }).click();
  await expect(page).toHaveURL(/\/purchase$/);
  await expect(page.locator('input[type="url"]')).toHaveValue('https://www.yes24.com/product/goods/109196213');
  await expect(page.getByLabel('Product category')).toHaveValue('collectibles');
});

test('the light stick reference and informational links lead to useful next steps', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('beauty');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Request BTS Proof' })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('kpop');
  await expect(page.getByRole('button', { name: 'Request BTS Proof' })).toBeVisible();
  await page.getByRole('link', { name: 'Read the K-pop buying guide' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How to buy K-pop albums and merch from Korea');
  await page.goto('/products?category=kpop');
  await page.getByRole('button', { name: 'Request SEVENTEEN light stick' }).click();
  await expect(page).toHaveURL(/\/purchase$/);
  await expect(page.locator('input[type="url"]')).toHaveValue('https://shop.weverse.io/ko/shop/KRW/artists/7/sales/13690');
  await expect(page.getByLabel('Product category')).toHaveValue('electronics');
});

test('eight products have bookmarkable pages, working photos and filter reset', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByRole('status')).toHaveText('Showing 1–4 of 8');
  const first = await page.locator('.product-card h2').allTextContents();
  await page.getByRole('link', { name: 'Page 2', exact: true }).click();
  await expect(page).toHaveURL(/\/products\?page=2$/);
  await expect(page.getByRole('status')).toHaveText('Showing 5–8 of 8');
  await expect(page.getByRole('link', { name: 'Page 2', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.product-card')).toHaveCount(4);
  const second = await page.locator('.product-card h2').allTextContents();
  expect(new Set([...first, ...second]).size).toBe(8);
  await expect.poll(() => page.locator('.product-photo img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 100))).toBe(true);
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Showing 5–8 of 8');
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('stationery');
  await expect(page).toHaveURL(/\/products\?category=stationery$/);
  await expect(page.getByRole('status')).toHaveText('Showing 1–2 of 2');
  await expect(page.getByRole('link', { name: 'Page 2', exact: true })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('status')).toHaveText('Showing 5–8 of 8');
});

test('category dropdown browses lifestyle finds by keyboard and prepares the correct draft', async ({ page }) => {
  await page.goto('/products?page=2');
  const category = page.getByRole('combobox', { name: 'Category', exact: true });
  await expect(category).toBeVisible();
  await expect(category.locator('option')).toHaveText(['All finds', 'Beauty & care', 'Stationery', 'Home & living', 'Bags & accessories', 'K-pop']);
  await category.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(category).toHaveValue('beauty');
  await expect(page).toHaveURL(/\/products\?category=beauty$/);
  await expect(page.getByRole('status')).toHaveText('Showing 1–2 of 2');
  await page.reload();
  await expect(category).toHaveValue('beauty');
  await page.getByRole('button', { name: 'Request rom&nd tint', exact: true }).click();
  await expect(page).toHaveURL(/\/purchase$/);
  await expect(page.locator('input[type="url"]')).toHaveValue('https://www.romand.co.kr/product/detail.html?product_no=958');
  await expect(page.getByLabel('Product category')).toHaveValue('cosmetics');
});

test('a browser with WebGL disabled uses the illustration without Three.js errors', async ({ baseURL }) => {
  const browser = await chromium.launch({ args: ['--disable-webgl'] });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseURL + '/');
    expect(await page.evaluate(() => document.createElement('canvas').getContext('webgl2'))).toBeNull();
    await page.getByLabel('Product link', { exact: true }).fill('https://www.yes24.com/product/goods/109196213');
    await page.getByRole('button', { name: 'Continue', exact: false }).click();
    await expect(page).toHaveURL(/\/purchase$/);
    expect(errors.filter(message => /THREE|WebGL|context|BindToCurrentSequence/i.test(message))).toEqual([]);
  } finally { await browser.close(); }
});

test('home and products compile and hydrate without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => {
    // Native headless-driver performance warnings are separate from application diagnostics.
    if ((message.type() === 'error' && /THREE|WebGL/.test(message.text())) || (message.type() === 'warning' && /THREE\./.test(message.text()))) errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && /\/_next\/.*\.(js|css)/.test(response.url())) errors.push(`${response.status()} ${response.url()}`);
  });
  for (const path of ['/', '/products']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    if (path === '/') await expect(page.locator('.parcel-world.is-ready canvas')).toBeVisible();
    await expect(page.locator('nextjs-portal').getByText('Build Error', { exact: true })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('retired APIs stay closed and the reseller API rejects guests', async ({ request }) => {
  expect((await request.get('/api/orders')).status()).toBe(410);
  expect((await request.get('/api/reseller/requests')).status()).toBe(401);
});


test('sample personas expose saved credit, delivery and customs gaps without real API calls', async ({ page }) => {
  const realRequests: string[] = [];
  page.on('request', request => { if (/\/api\/(purchases|delivery-profile|webhooks)/.test(request.url())) realRequests.push(request.url()); });
  await page.goto('/dev/workspace');
  const customer = page.getByRole('combobox', { name: 'Sample customer' });
  await expect(customer.locator('option')).toHaveCount(3);
  await expect(page.getByRole('region', { name: 'Account overview' })).toContainText('Sample credit balance');
  await customer.selectOption('sample-customer-cn');
  await expect(customer).toHaveValue('sample-customer-cn');
  await page.getByRole('button', { name: 'Customs review', exact: true }).click();
  await expect(page.getByText('No provider release record', { exact: true })).toBeVisible();
  await expect(page.getByText('Collection blocked by robots policy', { exact: true })).toHaveCount(4);
  await page.getByRole('button', { name: 'Payments', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Every little detail adds up.');
  await page.getByRole('button', { name: 'Delivery', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Follow your parcel’s story.');
  await page.reload();
  await expect(customer).toHaveValue('sample-customer-cn');
  expect(realRequests).toEqual([]);
});

test('classic form preview opens the Products tab without a render error', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dev/preview');
  await expect(page.getByLabel('Product link', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Discover Korea', exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.locator('.product-card')).toHaveCount(4);
  expect(errors).toEqual([]);
});
