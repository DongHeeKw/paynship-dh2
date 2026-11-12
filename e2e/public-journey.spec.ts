import { test, expect } from '@playwright/test';

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
  await expect(costs.locator('.cost-subtotal dd')).toHaveText('₩50,000');
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
  await expect(page.getByRole('button', { name: 'Turn parcel right' })).toBeVisible();
  const canvas = page.locator('.parcel-world-canvas canvas');
  const before = await canvas.screenshot();
  await page.waitForTimeout(300);
  expect(await canvas.screenshot()).toEqual(before);
  await page.getByRole('button', { name: 'Turn parcel right' }).click();
  await expect(async () => expect(await canvas.screenshot()).not.toEqual(before)).toPass();
  await canvas.evaluate(element => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('.parcel-world-fallback')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn parcel right' })).toHaveCount(0);
  await expect(page.getByLabel('Product link', { exact: true })).toBeEditable();
});

test('public screens fit small and large viewports', async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/', '/purchase', '/orders', '/settings/delivery', '/login', '/signup']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${path} at ${width}px`).toBe(true);
    }
  }
});
