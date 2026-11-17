import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptPii } from '../pii';
import { calculatePurchaseQuote } from '../quote';
import { sealReview, type StoredReview } from '../review-storage';

const mocks = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), history: vi.fn(), event: vi.fn(), audit: vi.fn(), quota: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { purchaseRequest: { findUniqueOrThrow: mocks.read } } }));
vi.mock('../transaction', () => ({ purchaseTransaction: (run: (tx: unknown) => unknown) => run({
  purchaseRequest: { findUnique: mocks.read, updateMany: mocks.update }, purchaseEvent: { findFirst: mocks.history, create: mocks.event },
  adminAuditLog: { create: mocks.audit },
}) }));
vi.mock('../quota', () => ({ consumeQuota: mocks.quota }));
vi.mock('../read', () => ({ purchaseDto: (row: unknown) => row }));
vi.mock('../operator-payment', () => ({ reconcilePurchasePayment: vi.fn() }));
import { updateOperatorPurchase } from '../operator';

const id = '11111111-1111-4111-8111-111111111111';
const now = Date.parse('2026-10-18T06:00:00Z');
const iso = (offset: number) => new Date(now + offset).toISOString();
const day = 86400000;
function review(patch: Partial<StoredReview> = {}): StoredReview {
  return { verifiedCategory: 'clothing', productName: 'Reviewed cotton shirt', productUnitPriceKrw: 14000, domesticShippingKrw: 0,
    exchangeRateKrwPerUsd: 1400, serviceFeeCents: 150, verifiedImportCharges: { dutyCents: 75, taxCents: 158, clearanceCents: 50 }, internationalShippingCents: 500, insuranceCents: 0,
    customsValueBasis: 'CIF', dutyBasisPoints: 500, taxBasisPoints: 1000, taxIncludesDuty: true, additionalTaxBaseCents: 0,
    hsCode: '610910', origin: 'KR', material: 'Cotton', weightKg: 0.3, dimensions: { l: 20, w: 20, h: 2 },
    rulesReference: 'https://broker.example.invalid/rules', evidenceReference: 'https://seller.example.invalid/product',
    rulesVerifiedAt: iso(-day), rulesValidUntil: iso(day), customsNotes: 'Operator-reviewed example only; not an actual legal approval.',
    recipientEvidence: { method: 'BROKER_REVIEW', reference: 'https://broker.example.invalid/recipient', verifiedAt: iso(-day), validUntil: iso(day),
      shipmentReference: 'AWB-A', notes: 'Operator-reviewed recipient authorization for this example shipment.' },
    destination: 'CN', reviewedBy: 'operator', reviewedAt: iso(-day), ...patch };
}
function request(status = 'READY_TO_SHIP', evidence = review()) {
  const { destination: _destination, reviewedBy: _by, reviewedAt: _at, ...quoteInput } = review();
  return { id, userId: 'customer', destination: 'CN', status, version: 4, quantity: 1, review: sealReview(evidence, id),
    quote: calculatePurchaseQuote(quoteInput, 1, 1, now), paidAt: new Date(now - day), paymentOrderId: 'verified-order',
    carrier: 'Carrier A', trackingNumber: 'AWB-A',
    encryptedDelivery: encryptPii({ fullName: 'Example Recipient', phone: '+8613912345678', country: 'CN', address1: 'Example street', address2: '',
      city: 'Beijing', region: 'Beijing', postalCode: '100000', customsId: '', customsIdType: 'NONE', customsAuthorization: 'BROKER' }, `request:${id}`) };
}
let row: ReturnType<typeof request>;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('PII_ENCRYPTION_KEY', 'a'.repeat(64)); vi.spyOn(Date, 'now').mockReturnValue(now);
  row = request(); mocks.read.mockImplementation(async () => row);
  mocks.update.mockImplementation(async ({ data }: { data: Partial<typeof row> }) => { row = { ...row, ...data, version: row.version + 1 }; return { count: 1 }; });
  mocks.history.mockResolvedValue({ status: 'READY_TO_SHIP' });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const dispatch = { action: 'status', version: 4, status: 'SHIPPED', carrier: 'Carrier A', trackingNumber: 'AWB-A', message: 'Confirmed operator dispatch.' };
const resumableStages = ['PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED'] as const;
const resume = { action: 'resume', version: 4, reason: 'Current evidence and the existing stage were reviewed.' };

describe('product customs evidence at dispatch and recovery', () => {
  it.each([
    { rulesValidUntil: iso(-1) }, { rulesVerifiedAt: iso(-31 * day) }, { rulesVerifiedAt: iso(60000) },
    { rulesVerifiedAt: 'invalid' }, { destination: 'US' },
  ])('blocks dispatch when product evidence is stale, invalid or for another destination: %j', patch => {
    row = request('READY_TO_SHIP', review(patch));
    return expect(updateOperatorPurchase(id, 'operator', dispatch)).rejects.toMatchObject({ status: 409 }).then(() => {
      expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.event).not.toHaveBeenCalled();
    });
  });
  it('allows dispatch with current product evidence and recipient evidence bound to the assigned shipment', async () => {
    await updateOperatorPurchase(id, 'operator', dispatch);
    expect(mocks.update).toHaveBeenCalledOnce(); expect(row.status).toBe('SHIPPED');
  });
  it('rejects tracking replacement hidden in a hold action before it can bypass shipment authorization', async () => {
    row = request('SHIPPED');
    await expect(updateOperatorPurchase(id, 'operator', { action: 'status', version: 4, status: 'ON_HOLD', message: 'Investigating a shipment issue.',
      carrier: 'Carrier B', trackingNumber: 'AWB-B' })).rejects.toMatchObject({ status: 422 });
    expect(row.trackingNumber).toBe('AWB-A'); expect(mocks.update).not.toHaveBeenCalled();
  });
  it('blocks resuming a shipped hold with expired product evidence', async () => {
    row = request('ON_HOLD', review({ rulesValidUntil: iso(-1) })); mocks.history.mockResolvedValue({ status: 'SHIPPED' });
    await expect(updateOperatorPurchase(id, 'operator', { action: 'resume', version: 4, reason: 'Carrier issue reviewed and resolved.' })).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('blocks resuming a shipped hold when recipient authorization belongs to a different shipment', async () => {
    row = request('ON_HOLD'); row.trackingNumber = 'AWB-B'; mocks.history.mockResolvedValue({ status: 'SHIPPED' });
    await expect(updateOperatorPurchase(id, 'operator', { action: 'resume', version: 4, reason: 'Carrier issue reviewed and resolved.' })).rejects.toMatchObject({ status: 422 });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('refreshes evidence on an existing fulfilment hold without resetting to PAID or changing paid cents', async () => {
    row = request('ON_HOLD', review({ rulesValidUntil: iso(-1) })); mocks.history.mockResolvedValue({ status: 'SHIPPED' });
    const paidQuote = row.quote; const paidAt = row.paidAt;
    const current = review(); const { destination: _destination, reviewedBy: _by, reviewedAt: _at, ...input } = current;
    await updateOperatorPurchase(id, 'operator', { action: 'revalidate', version: 4, review: input });
    expect(row.status).toBe('ON_HOLD'); expect(row.quote).toBe(paidQuote); expect(row.paidAt).toBe(paidAt); expect(row.trackingNumber).toBe('AWB-A');
    await updateOperatorPurchase(id, 'operator', { action: 'resume', version: 5, reason: 'Current evidence and the existing shipment were reviewed.' });
    expect(row.status).toBe('SHIPPED'); expect(row.quote).toBe(paidQuote);
  });
  it('rejects changed amounts while refreshing evidence for an existing fulfilment hold', async () => {
    row = request('ON_HOLD');
    const current = review({ serviceFeeCents: 999 }); const { destination: _destination, reviewedBy: _by, reviewedAt: _at, ...input } = current;
    await expect(updateOperatorPurchase(id, 'operator', { action: 'revalidate', version: 4, review: input })).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).not.toHaveBeenCalled(); expect(row.status).toBe('ON_HOLD');
  });
  it('keeps a historical paid minimum fee and clearance line immutable after the policy changes', async () => {
    row = request('ON_HOLD');
    row.quote = { ...row.quote, serviceFeePolicy: 'retailer-order-15pct-min10000krw-v1', serviceFeeKrw: 10000,
      serviceFeeCents: 714, totalCents: row.quote.totalCents + 564 };
    const original = row.quote;
    const { destination: _destination, reviewedBy: _by, reviewedAt: _at, ...input } = review({ serviceFeeCents: 714 });
    await updateOperatorPurchase(id, 'operator', { action: 'revalidate', version: 4, review: input });
    expect(row.quote).toBe(original);
    expect(row.quote.clearanceCents).toBe(50);
    expect(row.status).toBe('ON_HOLD');
    await expect(updateOperatorPurchase(id, 'operator', { action: 'revalidate', version: 5,
      review: { ...input, verifiedImportCharges: { dutyCents: 75, taxCents: 158, clearanceCents: 51 } },
    })).rejects.toMatchObject({ status: 409 });
    expect(row.quote).toBe(original);
  });
  it.each(resumableStages)('refuses stale, missing or unrelated product evidence before resuming %s', async stage => {
    mocks.history.mockResolvedValue({ status: stage });
    for (const candidate of [
      request('ON_HOLD', review({ rulesValidUntil: iso(-1) })),
      { ...request('ON_HOLD'), review: null },
      request('ON_HOLD', review({ destination: 'US' })),
    ]) {
      mocks.read.mockResolvedValue(candidate);
      await expect(updateOperatorPurchase(id, 'operator', resume)).rejects.toMatchObject({ status: 409 });
      expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.event).not.toHaveBeenCalled();
    }
  });
  it.each(resumableStages)('refuses expired recipient evidence before resuming %s', async stage => {
    row = request('ON_HOLD', review({ recipientEvidence: { ...review().recipientEvidence, validUntil: iso(-1) } }));
    mocks.history.mockResolvedValue({ status: stage });
    await expect(updateOperatorPurchase(id, 'operator', resume)).rejects.toMatchObject({ status: 422 });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.event).not.toHaveBeenCalled();
  });
  it.each(resumableStages)('keeps %s held after the country policy deadline despite fresh manual evidence on 2026-11-15', async stage => {
    const auditNow = Date.parse('2026-11-15T06:00:00Z');
    const recent = (offset: number) => new Date(auditNow + offset).toISOString();
    vi.spyOn(Date, 'now').mockReturnValue(auditNow);
    row = request('ON_HOLD', review({ rulesVerifiedAt: recent(-day), rulesValidUntil: recent(day),
      recipientEvidence: { ...review().recipientEvidence, verifiedAt: recent(-day), validUntil: recent(day) } }));
    mocks.history.mockResolvedValue({ status: stage });
    await expect(updateOperatorPurchase(id, 'operator', resume)).rejects.toMatchObject({ status: 422, message: expect.stringContaining('source refresh') });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.event).not.toHaveBeenCalled();
  });
  it.each(resumableStages)('resumes exactly %s with current evidence before the policy deadline while preserving paid and shipment data', async stage => {
    row = request('ON_HOLD'); mocks.history.mockResolvedValue({ status: stage });
    const quote = row.quote; const paidAt = row.paidAt; const paymentOrderId = row.paymentOrderId;
    const encryptedDelivery = row.encryptedDelivery; const savedReview = row.review;
    await updateOperatorPurchase(id, 'operator', resume);
    expect(row.status).toBe(stage); expect(row.quote).toBe(quote); expect(row.paidAt).toBe(paidAt); expect(row.paymentOrderId).toBe(paymentOrderId);
    expect(row.carrier).toBe('Carrier A'); expect(row.trackingNumber).toBe('AWB-A'); expect(row.encryptedDelivery).toBe(encryptedDelivery); expect(row.review).toBe(savedReview);
    expect(mocks.update).toHaveBeenCalledOnce(); expect(mocks.event).toHaveBeenCalledOnce();
  });
  it.each(['product', 'recipient'])('caps a new quote at the %s evidence 30-day cutoff', async kind => {
    row = request('REVIEW_REQUIRED');
    const current = review(kind === 'product' ? { rulesVerifiedAt: iso(-30 * day + 3600000) } : {
      recipientEvidence: { ...review().recipientEvidence, verifiedAt: iso(-30 * day + 3600000) },
    });
    const { destination: _destination, reviewedBy: _by, reviewedAt: _at, ...input } = current;
    await updateOperatorPurchase(id, 'operator', { action: 'quote', version: 4, review: input });
    expect(mocks.update.mock.calls[0][0].data.quoteExpiresAt).toEqual(new Date(now + 3600000));
  });
});
