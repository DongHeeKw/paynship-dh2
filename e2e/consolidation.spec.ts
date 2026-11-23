import { test, expect } from '@playwright/test';

test('generated plans, evidence failures and operator traces', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dev/consolidation');
  await expect(page.getByRole('heading', { name: '함께 배송하면 8,000원 아낄 수 있어요' })).toBeVisible();
  await expect(page.getByText('3일 더 기다려야 해요')).toBeVisible();
  await page.getByRole('button', { name: '함께 배송 선택하기' }).click();
  await expect(page.getByRole('status')).toContainText('실제 신청·결제·출고는 진행되지 않았어요');
  await page.getByLabel('계산 시나리오').selectOption('bulky');
  await expect(page.getByRole('heading', { name: '따로 보내는 게 더 유리해요' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '함께 배송 선택하기' })).toHaveCount(0);
  for (const scenario of ['missing', 'expired']) {
    await page.getByLabel('계산 시나리오').selectOption(scenario);
    await expect(page.getByRole('heading', { name: '배송비를 확인하고 있어요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '함께 배송 선택하기' })).toHaveCount(0);
  }
  await page.getByLabel('계산 시나리오').selectOption('partial');
  await page.getByRole('button', { name: '자택 운영 화면' }).click();
  await expect(page.getByRole('heading', { name: '후보별 계산 근거' })).toBeVisible();
  await expect(page.getByText('약속한 출고·도착 기한을 넘어요.').first()).toBeVisible();
  await page.locator('summary').first().click();
  await expect(page.getByText(/실중량 800g/).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('operator.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '고객 화면' }).click();
  await page.getByLabel('계산 시나리오').selectOption('wait');
  await page.screenshot({ path: testInfo.outputPath('customer.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('public host cannot open the fixture', async ({ request }) => {
  const response = await request.get('/dev/consolidation', { headers: { host: 'public.example' }, maxRedirects: 0 });
  expect(response.status()).toBe(404);
});
