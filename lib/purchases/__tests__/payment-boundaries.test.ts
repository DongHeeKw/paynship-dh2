import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyHostedPayment } from '../payment-verification';
import { createHostedPayment, paymentProviderConfig } from '../payment-provider';
import type { PurchaseQuote } from '../quote';
import { deliveryProfileSchema } from '../schemas';

const id = 'gid://shopify/DraftOrder/123';
const quote: PurchaseQuote = { currency: 'USD', productName: 'Fictional album', productCents: 1000,
  domesticShippingCents: 0, serviceFeeCents: 150, internationalShippingCents: 50, insuranceCents: 0,
  dutyCents: 0, taxCents: 0, totalCents: 1200, quoteVersion: 2 };
const delivery = deliveryProfileSchema.parse({ fullName: 'Test Customer', phone: '+12025550123', country: 'US', address1: '123 Example Street', city: 'Example', region: 'CA', postalCode: '90210' });
const now = new Date('2026-11-18T00:00:00Z');
const money = () => ({ presentmentMoney: { amount: '12.00', currencyCode: 'USD' } });
function evidence() {
  return { id, invoiceUrl: 'https://test-store.myshopify.com/invoice',
    customAttributes: [{ key: 'purchase_request_id', value: 'request' }, { key: 'purchase_quote_version', value: '2' }],
    totalPriceSet: money(), order: { id: 'gid://shopify/Order/456', fullyPaid: true,
      displayFinancialStatus: 'PAID', cancelledAt: null as string | null, totalPriceSet: money(),
      transactions: [{ status: 'SUCCESS', kind: 'SALE', processedAt: now.toISOString() as string | null, test: false }] } };
}
function respond(body: unknown, status = 200) { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body, { status }))); }
function verify() { return verifyHostedPayment(id, 'request', quote); }
function create() { return createHostedPayment('request', quote, 'test@example.invalid', delivery); }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now);
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test-store.myshopify.com'); vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', 'test-token');
  vi.stubEnv('SHOPIFY_WEBHOOK_SECRET', 'test-secret'); vi.stubEnv('SHOPIFY_API_VERSION', '2026-07');
  vi.stubEnv('NODE_ENV', 'production');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('payment boundary independent rejection conditions', () => {
  it.each([
    ['SHOPIFY_STORE_DOMAIN', 'attacker.invalid'], ['SHOPIFY_ADMIN_ACCESS_TOKEN', ''],
    ['SHOPIFY_WEBHOOK_SECRET', ''], ['SHOPIFY_API_VERSION', '2026-02'],
  ])('rejects invalid configuration %s before making a request', (key, value) => {
    vi.stubGlobal('fetch', vi.fn()); vi.stubEnv(key, value);
    expect(paymentProviderConfig).toThrow(); expect(fetch).not.toHaveBeenCalled();
  });
  it('uses the documented API version when no override exists', () => {
    vi.stubEnv('SHOPIFY_API_VERSION', undefined);
    expect(paymentProviderConfig()).toMatchObject({ version: '2026-07' });
  });
  it('rejects an invalid stored draft identity without contacting the provider', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(verifyHostedPayment('123', 'request', quote)).rejects.toMatchObject({ status: 409 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([create, verify])('fails closed on provider HTTP failure', async operation => {
    respond({}, 503); await expect(operation()).rejects.toMatchObject({ status: 503 });
  });
  it.each(['graphql', 'schema'])('rejects %s evidence independently', async invalid => {
    respond({ data: { draftOrder: invalid === 'schema' ? {} : evidence() }, errors: invalid === 'graphql' ? [{ message: 'failed' }] : [] });
    await expect(verify()).rejects.toMatchObject({ status: 503 });
  });
  it.each(['request', 'version', 'draft-total', 'unpaid', 'cancelled'])('rejects %s mismatch with other evidence valid', async invalid => {
    const d = evidence();
    if (invalid === 'request') d.customAttributes[0].value = 'another-request';
    if (invalid === 'version') d.customAttributes[1].value = '1';
    if (invalid === 'draft-total') d.totalPriceSet.presentmentMoney.amount = '11.99';
    if (invalid === 'unpaid') d.order.fullyPaid = false;
    if (invalid === 'cancelled') d.order.cancelledAt = now.toISOString();
    respond({ data: { draftOrder: d } });
    await expect(verify()).rejects.toMatchObject({ status: 409 });
  });
  it.each(['status', 'kind', 'timestamp', 'invalid-date', 'future-date', 'test'])('requires a successful real transaction: %s', async invalid => {
    const d = evidence(), transaction = d.order.transactions[0];
    if (invalid === 'status') transaction.status = 'FAILURE';
    if (invalid === 'kind') transaction.kind = 'AUTHORIZATION';
    if (invalid === 'timestamp') transaction.processedAt = null;
    if (invalid === 'invalid-date') transaction.processedAt = 'not-a-date';
    if (invalid === 'future-date') transaction.processedAt = new Date(+now + 300001).toISOString();
    if (invalid === 'test') transaction.test = true;
    respond({ data: { draftOrder: d } });
    await expect(verify()).rejects.toMatchObject({ status: 409 });
  });
  it('accepts a real capture exactly at the clock-skew limit', async () => {
    const d = evidence(); d.order.transactions[0].kind = 'CAPTURE';
    d.order.transactions[0].processedAt = new Date(+now + 300000).toISOString();
    respond({ data: { draftOrder: d } });
    expect((await verify()).paidAt?.toISOString()).toBe(d.order.transactions[0].processedAt);
  });
  it('allows test transactions only outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test'); const d = evidence(); d.order.transactions[0].test = true;
    respond({ data: { draftOrder: d } }); expect((await verify()).orderId).toBe('456');
  });
  it.each([null, 'https://checkout.shopify.com/invoice'])('keeps an unpaid draft pending with invoice %s', async invoiceUrl => {
    respond({ data: { draftOrder: { ...evidence(), order: null, invoiceUrl } } });
    expect(await verify()).toMatchObject({ orderId: null, paidAt: null, checkoutUrl: invoiceUrl });
  });
  const invalidUrls = ['http://test-store.myshopify.com/invoice', 'https://user@test-store.myshopify.com/invoice',
    'https://:password@test-store.myshopify.com/invoice', 'https://test-store.myshopify.com:444/invoice', 'https://attacker.invalid/invoice'];
  it.each(invalidUrls)('rejects unsafe verification invoice %s', async invoiceUrl => {
    respond({ data: { draftOrder: { ...evidence(), invoiceUrl } } });
    await expect(verify()).rejects.toMatchObject({ status: 503 });
  });
  it.each(invalidUrls)('rejects unsafe creation invoice %s', async invoiceUrl => {
    respond({ data: { draftOrderCreate: { draftOrder: { ...evidence(), invoiceUrl }, userErrors: [] } } });
    await expect(create()).rejects.toMatchObject({ status: 503 });
  });
  it.each(['graphql', 'user-error', 'identity', 'invoice', 'currency'])('rejects creation %s with the approved total intact', async invalid => {
    const d = evidence();
    if (invalid === 'identity') d.id = '';
    if (invalid === 'invoice') d.invoiceUrl = '';
    if (invalid === 'currency') d.totalPriceSet.presentmentMoney.currencyCode = 'KRW';
    respond({ errors: invalid === 'graphql' ? [{ message: 'failed' }] : [], data: { draftOrderCreate: { draftOrder: d, userErrors: invalid === 'user-error' ? [{ message: 'failed' }] : [] } } });
    await expect(create()).rejects.toMatchObject({ status: 503 });
  });
});
