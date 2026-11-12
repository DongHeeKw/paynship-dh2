import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHostedPayment } from '../payment-provider';
import type { PurchaseQuote } from '../quote';
import { deliveryProfileSchema } from '../schemas';

const quote: PurchaseQuote = { currency: 'USD', productName: 'Synthetic test product', productCents: 10000, domesticShippingCents: 300,
  serviceFeeCents: 1500, internationalShippingCents: 2500, insuranceCents: 50, dutyCents: 100, taxCents: 400, clearanceCents: 75, totalCents: 14925, quoteVersion: 3 };
const delivery = deliveryProfileSchema.parse({ fullName: 'Example Customer', phone: '+12025550123', country: 'US', address1: '123 Example Street', city: 'Example', region: 'CA', postalCode: '90210' });
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test-only.myshopify.com');
  vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', 'synthetic-test-token');
  vi.stubEnv('SHOPIFY_WEBHOOK_SECRET', 'synthetic-test-secret');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function providerResponse(total: string) {
  return new Response(JSON.stringify({ data: { draftOrderCreate: { userErrors: [], draftOrder: { id: 'gid://shopify/DraftOrder/123', invoiceUrl: 'https://test-only.myshopify.com/invoice/test', totalPriceSet: { presentmentMoney: { amount: total, currencyCode: 'USD' } } } } } }), { status: 200 });
}

describe('reviewed charges at the hosted payment boundary', () => {
  it('sends clearance exactly once and preserves the complete approved line-item total', async () => {
    fetchMock.mockResolvedValue(providerResponse('149.25'));
    await createHostedPayment('request', quote, 'test@example.invalid', delivery);
    const input = JSON.parse(fetchMock.mock.calls[0][1].body).variables.input;
    expect(input.lineItems.filter((line: { title: string }) => line.title === 'Customs clearance')).toEqual([
      expect.objectContaining({ quantity: 1, taxable: false, originalUnitPriceWithCurrency: { amount: '0.75', currencyCode: 'USD' } }),
    ]);
    expect(input.lineItems.reduce((sum: number, line: { originalUnitPriceWithCurrency: { amount: string } }) => sum + Math.round(Number(line.originalUnitPriceWithCurrency.amount) * 100), 0)).toBe(quote.totalCents);
    expect(input.acceptAutomaticDiscounts).toBe(false);
    expect(input.allowDiscountCodesInCheckout).toBe(false);
  });
  it('preserves historical quotes without a clearance field', async () => {
    const { clearanceCents, ...historical } = quote;
    fetchMock.mockResolvedValue(providerResponse('148.50'));
    await createHostedPayment('request', { ...historical, totalCents: quote.totalCents - clearanceCents! }, 'test@example.invalid', delivery);
    const lines = JSON.parse(fetchMock.mock.calls[0][1].body).variables.input.lineItems;
    expect(lines.some((line: { title: string }) => line.title === 'Customs clearance')).toBe(false);
  });
  it('refuses a provider total that omits clearance', async () => {
    fetchMock.mockResolvedValue(providerResponse('148.50'));
    await expect(createHostedPayment('request', quote, 'test@example.invalid', delivery)).rejects.toMatchObject({ status: 503 });
  });
});
