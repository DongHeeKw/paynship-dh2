/**
 * PayNShip v2.1 — Auth guard E2E
 *
 * 로그인 필수 라우트들이 비로그인 상태에서 올바르게 redirect 되는지 확인.
 */

import { test, expect } from '@playwright/test';

test.describe('v2.1 Auth Guards', () => {
  test('/my-orders redirects to /auth/callback when unauthenticated', async ({ page }) => {
    const response = await page.goto('/my-orders');
    // Next.js redirect returns 200 after following, but URL must change
    expect(page.url()).toContain('/auth/callback');
    expect(page.url()).toContain('redirect=');
  });

  test('/my-orders/[id] redirects to /auth/callback', async ({ page }) => {
    await page.goto('/my-orders/some-fake-id');
    expect(page.url()).toContain('/auth/callback');
  });

  test('/checkout/review redirects to /auth/callback', async ({ page }) => {
    await page.goto('/checkout/review?items=eyJ0ZXN0IjoxfQ');
    expect(page.url()).toContain('/auth/callback');
  });

  test('/api/my-orders returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.get('/api/my-orders');
    expect(response.status()).toBe(401);
  });

  test('/api/draft-order POST returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.post('/api/draft-order', {
      data: {
        lineItems: [{ title: 'x', quantity: 1 }],
        shippingAddress: { address1: 'x', city: 'x', country: 'US', zip: '12345' },
      },
    });
    expect(response.status()).toBe(401);
  });

  test('/api/cs/handoff POST returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.post('/api/cs/handoff', {
      data: { orderId: '00000000-0000-0000-0000-000000000000', reason: 'other' },
    });
    expect(response.status()).toBe(401);
  });
});
