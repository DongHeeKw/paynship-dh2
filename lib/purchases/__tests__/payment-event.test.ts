import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { purchaseEventMessage } from '../event-record';

const mocks = vi.hoisted(() => ({
  stored: vi.fn(), current: vi.fn(), receipt: vi.fn(), transactionReceipt: vi.fn(),
  update: vi.fn(), event: vi.fn(), saveReceipt: vi.fn(), verify: vi.fn(),
}));
vi.mock('@/lib/db/prisma', () => ({ prisma: {
  purchaseRequest: { findUnique: mocks.stored }, purchaseWebhookReceipt: { findUnique: mocks.receipt },
} }));
vi.mock('../transaction', () => ({ purchaseTransaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
  purchaseRequest: { findUnique: mocks.current, update: mocks.update },
  purchaseWebhookReceipt: { findUnique: mocks.transactionReceipt, create: mocks.saveReceipt },
  purchaseEvent: { create: mocks.event },
}) }));
vi.mock('../payment-verification', () => ({ verifyHostedPayment: mocks.verify }));
import { applyPaymentEvent } from '../payment-event';

const requestId = '861e6b97-ad93-44bc-a01c-0ee87f49af2b';
const draftId = 'gid://shopify/DraftOrder/123';
const paidAt = new Date('2026-11-15T00:00:00.000Z');
type PaymentUpdate = { status: string; paymentOrderId: string; paidAt: Date; version: { increment: number } };
function request() {
  return { id: requestId, status: 'PAYMENT_PENDING', version: 4, paymentDraftId: draftId,
    paymentOrderId: null as string | null, paidAt: null as Date | null,
    quote: { quoteVersion: 2, totalCents: 1200 }, quoteExpiresAt: new Date(paidAt.getTime() + 3600000) };
}
function webhook(amount = '12.00', currency = 'USD', quoteVersion = '2') {
  return Buffer.from(JSON.stringify({ id: 456, financial_status: 'paid', total_price_set: { presentment_money: { amount, currency_code: currency } },
    note_attributes: [{ name: 'purchase_request_id', value: requestId }, { name: 'purchase_quote_version', value: quoteVersion }] }));
}
let row = request();
const receipts = new Set<string>();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('PII_ENCRYPTION_KEY', 'a'.repeat(64));
  row = request(); receipts.clear();
  mocks.stored.mockImplementation(async () => ({ ...row }));
  mocks.current.mockImplementation(async () => ({ ...row }));
  const receipt = async ({ where }: { where: { id: string } }) => receipts.has(where.id) ? { id: where.id } : null;
  mocks.receipt.mockImplementation(receipt);
  mocks.transactionReceipt.mockImplementation(receipt);
  mocks.saveReceipt.mockImplementation(async ({ data }: { data: { id: string } }) => { receipts.add(data.id); return data; });
  mocks.update.mockImplementation(async ({ data }: { data: PaymentUpdate }) => {
    row = { ...row, ...data, version: row.version + data.version.increment }; return row;
  });
  mocks.verify.mockResolvedValue({ draftId, orderId: '456', paidAt, checkoutUrl: null });
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('verified payment event state changes', () => {
  it('records a timely payment while preserving an existing operator hold', async () => {
    row.status = 'ON_HOLD';
    await applyPaymentEvent(webhook());
    expect(row).toMatchObject({ status: 'ON_HOLD', paymentOrderId: '456', paidAt, version: 5 });
    expect(mocks.verify).toHaveBeenCalledExactlyOnceWith(draftId, requestId, row.quote);
    const event = mocks.event.mock.calls[0][0].data;
    expect(event).toMatchObject({ requestId, source: 'payment_provider', status: 'ON_HOLD' });
    expect(purchaseEventMessage(requestId, event)).toContain('Existing hold preserved');
    expect(receipts.size).toBe(1);
  });

  it('continues the normal timely payment from PAYMENT_PENDING to PAID', async () => {
    await applyPaymentEvent(webhook());
    expect(row).toMatchObject({ status: 'PAID', paymentOrderId: '456', paidAt, version: 5 });
    expect(purchaseEventMessage(requestId, mocks.event.mock.calls[0][0].data)).toBe('Payment confirmed by the payment provider.');
  });

  it.each(['PAYMENT_PENDING', 'ON_HOLD'])('keeps an expired payment on hold from %s', async status => {
    row.status = status; row.quoteExpiresAt = paidAt;
    await applyPaymentEvent(webhook());
    expect(row).toMatchObject({ status: 'ON_HOLD', paymentOrderId: '456', paidAt });
    expect(purchaseEventMessage(requestId, mocks.event.mock.calls[0][0].data)).toContain('after quote expiry');
  });

  it('deduplicates redelivery without changing the hold, payment, version or event a second time', async () => {
    row.status = 'ON_HOLD';
    const raw = webhook();
    await applyPaymentEvent(raw); await applyPaymentEvent(raw);
    expect(row).toMatchObject({ status: 'ON_HOLD', paymentOrderId: '456', paidAt, version: 5 });
    expect(mocks.verify).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.event).toHaveBeenCalledOnce();
    expect(mocks.saveReceipt).toHaveBeenCalledOnce();
  });

  it('rechecks receipt ownership inside the transaction after provider verification', async () => {
    mocks.transactionReceipt.mockResolvedValue({ id: 'already-recorded' });
    await applyPaymentEvent(webhook());
    expect(mocks.verify).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.event).not.toHaveBeenCalled();
    expect(mocks.saveReceipt).not.toHaveBeenCalled();
  });

  it('refuses a provider order that did not originate from the stored checkout', async () => {
    mocks.verify.mockResolvedValue({ draftId, orderId: '999', paidAt });
    await expect(applyPaymentEvent(webhook())).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.saveReceipt).not.toHaveBeenCalled();
  });

  it('rechecks the assigned draft after provider verification', async () => {
    mocks.current.mockResolvedValue({ ...row, paymentDraftId: 'gid://shopify/DraftOrder/999' });
    await expect(applyPaymentEvent(webhook())).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it.each([['1.00', 'USD', '2'], ['12.00', 'EUR', '2'], ['12.00', 'USD', '3']])('rejects mismatched amount/currency/quote %s %s %s', async (amount, currency, version) => {
    await expect(applyPaymentEvent(webhook(amount, currency, version))).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.saveReceipt).not.toHaveBeenCalled();
  });

  it('does not replace another payment already assigned to the request', async () => {
    row.paymentOrderId = '999';
    await expect(applyPaymentEvent(webhook())).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.saveReceipt).not.toHaveBeenCalled();
  });
});
