import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyHostedPayment } from '../payment-verification';
import type { PurchaseQuote } from '../quote';

const requestId = '861e6b97-ad93-44bc-a01c-0ee87f49af2b';
const draftId = 'gid://shopify/DraftOrder/123';
const quote = { quoteVersion: 2, totalCents: 1200 } as PurchaseQuote;
function evidence() {
  return { id: draftId, invoiceUrl: 'https://test-store.myshopify.com/checkouts/invoice',
    customAttributes: [{ key: 'purchase_request_id', value: requestId }, { key: 'purchase_quote_version', value: '2' }],
    totalPriceSet: { presentmentMoney: { amount: '12.00', currencyCode: 'USD' } },
    order: { id: 'gid://shopify/Order/456', fullyPaid: true, displayFinancialStatus: 'PAID', cancelledAt: null,
      totalPriceSet: { presentmentMoney: { amount: '12.00', currencyCode: 'USD' } },
      transactions: [{ status: 'SUCCESS', kind: 'SALE', processedAt: new Date(Date.now() - 60000).toISOString(), test: false }] } };
}
function respond(data: ReturnType<typeof evidence>) { vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { draftOrder: data } }))); }
beforeEach(() => {
  vi.stubEnv('SHOPIFY_STORE_DOMAIN', 'test-store.myshopify.com'); vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', 'unit-test-token');
  vi.stubEnv('SHOPIFY_WEBHOOK_SECRET', 'unit-test-secret');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('payment provider evidence', () => {
  it('queries the exact draft and uses successful provider transaction time', async () => {
    const draft = evidence(); respond(draft);
    const result = await verifyHostedPayment(draftId, requestId, quote);
    expect(result.orderId).toBe('456'); expect(result.paidAt?.toISOString()).toBe(draft.order.transactions[0].processedAt);
    const options = vi.mocked(fetch).mock.calls[0][1]!;
    expect(JSON.parse(options.body as string).variables.id).toBe(draftId);
  });
  it('rejects a draft with copied request attributes but a different provider identity', async () => {
    const draft = evidence(); draft.id = 'gid://shopify/DraftOrder/999'; respond(draft);
    await expect(verifyHostedPayment(draftId, requestId, quote)).rejects.toMatchObject({ status: 409 });
  });
  it('rejects a paid order whose final amount differs from the reviewed total', async () => {
    const draft = evidence(); draft.order.totalPriceSet.presentmentMoney.amount = '1.00'; respond(draft);
    await expect(verifyHostedPayment(draftId, requestId, quote)).rejects.toMatchObject({ status: 409 });
  });
  it('rejects a refunded order even when its original total matches', async () => {
    const draft = evidence(); draft.order.displayFinancialStatus = 'REFUNDED'; respond(draft);
    await expect(verifyHostedPayment(draftId, requestId, quote)).rejects.toMatchObject({ status: 409 });
  });
  it('does not accept a test transaction as a production payment', async () => {
    vi.stubEnv('NODE_ENV', 'production'); const draft = evidence(); draft.order.transactions[0].test = true; respond(draft);
    await expect(verifyHostedPayment(draftId, requestId, quote)).rejects.toMatchObject({ status: 409 });
  });
  it('refuses verification when provider credentials are missing', async () => {
    vi.stubEnv('SHOPIFY_ADMIN_ACCESS_TOKEN', ''); vi.stubGlobal('fetch', vi.fn());
    await expect(verifyHostedPayment(draftId, requestId, quote)).rejects.toMatchObject({ status: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
