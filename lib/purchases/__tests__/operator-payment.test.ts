import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  read: vi.fn(), events: vi.fn(), current: vi.fn(), update: vi.fn(), audit: vi.fn(), event: vi.fn(),
  verify: vi.fn(), quota: vi.fn(), dto: vi.fn(),
}));
vi.mock('@/lib/db/prisma', () => ({ prisma: { purchaseRequest: { findUnique: mocks.read, findUniqueOrThrow: mocks.read }, purchaseEvent: { findFirst: mocks.events } } }));
vi.mock('../transaction', () => ({ purchaseTransaction: (fn: (tx: unknown) => unknown) => fn({
  purchaseRequest: { findUnique: mocks.current, update: mocks.update }, purchaseEvent: { create: mocks.event }, adminAuditLog: { create: mocks.audit },
}) }));
vi.mock('../payment-verification', () => ({ verifyHostedPayment: mocks.verify }));
vi.mock('../quota', () => ({ consumeQuota: mocks.quota }));
vi.mock('../read', () => ({ purchaseDto: mocks.dto }));
import { reconcilePurchasePayment } from '../operator-payment';

const row = { id: 'request', version: 4, status: 'ON_HOLD', quote: { totalCents: 1200, quoteVersion: 2 },
  paymentDraftId: 'gid://shopify/DraftOrder/123', paymentOrderId: '456', quoteExpiresAt: new Date(Date.now() + 3600000) };
beforeEach(() => {
  vi.resetAllMocks(); mocks.read.mockResolvedValue({ ...row }); mocks.events.mockResolvedValue(null);
  mocks.verify.mockResolvedValue({ draftId: row.paymentDraftId, orderId: '456', paidAt: new Date(), checkoutUrl: null });
  mocks.current.mockResolvedValue({ ...row });
});

describe('held payment recovery', () => {
  it('does not turn an existing fulfilment hold into a second purchase', async () => {
    mocks.events.mockResolvedValue({ status: 'SHIPPED' });
    await expect(reconcilePurchasePayment('request', 'operator', 4, row.paymentDraftId)).rejects.toMatchObject({ status: 409 });
    expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it('rejects another checkout before contacting the payment provider', async () => {
    await expect(reconcilePurchasePayment('request', 'operator', 4, 'gid://shopify/DraftOrder/999')).rejects.toMatchObject({ status: 409 });
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it('rechecks the version after the external provider response', async () => {
    mocks.current.mockResolvedValue({ ...row, version: 5 });
    await expect(reconcilePurchasePayment('request', 'operator', 4, row.paymentDraftId)).rejects.toMatchObject({ status: 409 });
    expect(mocks.verify).toHaveBeenCalledOnce(); expect(mocks.update).not.toHaveBeenCalled();
  });
});
