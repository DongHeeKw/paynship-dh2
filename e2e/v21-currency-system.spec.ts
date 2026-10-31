/**
 * PayNShip v2.1 — Currency system E2E
 */

import { test, expect } from '@playwright/test';

test.describe('v2.1 Currency System', () => {
  test('/api/exchange-rate returns USD rates', async ({ request }) => {
    const response = await request.get('/api/exchange-rate');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.base).toBe('USD');
    expect(typeof body.rates).toBe('object');
    expect(body.rates.USD).toBe(1);
    expect(body.currencyCount).toBeGreaterThan(10);
  });

  test('/dev/currency-test page renders', async ({ page }) => {
    await page.goto('/dev/currency-test');
    await expect(page.locator('h1')).toContainText('Currency System Test');
    // Price 컴포넌트 렌더링 확인 ($25.00 문자 어딘가에 있어야)
    await expect(page.getByText('$25.00', { exact: false }).first()).toBeVisible();
  });

  test('Middleware sets currency cookie on first visit', async ({ page }) => {
    await page.goto('/');
    const cookies = await page.context().cookies();
    const currencyCookie = cookies.find(c => c.name === 'paynship:v2:currency');
    expect(currencyCookie).toBeDefined();
    expect(currencyCookie?.value).toMatch(/^[A-Z]{3}$/); // ISO 4217
  });

  test('Middleware increments session counter', async ({ page }) => {
    await page.goto('/');
    const cookies = await page.context().cookies();
    const counter = cookies.find(c => c.name === 'paynship:v2:session_count');
    expect(counter).toBeDefined();
    expect(Number(counter?.value)).toBeGreaterThan(0);
  });
});
