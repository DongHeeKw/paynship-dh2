import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PurchaseReview } from '../review-schema';
import { openReview } from '../review-storage';

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), event: vi.fn(), audit: vi.fn(), recipient: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { purchaseRequest: { findUniqueOrThrow: mocks.read } } }));
vi.mock('../transaction', () => ({ purchaseTransaction: (fn: (tx: unknown) => unknown) => fn({
  purchaseRequest: { findUnique: mocks.read, updateMany: mocks.write }, purchaseEvent: { create: mocks.event }, adminAuditLog: { create: mocks.audit },
}) }));
vi.mock('../quota', () => ({ consumeQuota: vi.fn() }));
vi.mock('../recipient-review', () => ({ reviewRecipient: mocks.recipient }));
import { updateOperatorPurchase } from '../operator';

const now = Date.parse('2026-11-13T12:00:00Z');
const review: PurchaseReview = {
  verifiedCategory: 'clothing', productName: 'Synthetic test shirt', productUnitPriceKrw: 100000, domesticShippingKrw: 0,
  exchangeRateKrwPerUsd: 1000, serviceFeeCents: 1, internationalShippingCents: 500, insuranceCents: 0,
  customsValueBasis: 'CIF', dutyBasisPoints: 0, taxBasisPoints: 0, taxIncludesDuty: true, additionalTaxBaseCents: 0,
  hsCode: '610910', origin: 'KR', material: 'Cotton', weightKg: 0.5, dimensions: { l: 20, w: 20, h: 10 },
  rulesReference: 'https://evidence.example.invalid/customs', evidenceReference: 'https://evidence.example.invalid/product',
  rulesVerifiedAt: '2026-11-13T10:00:00Z', rulesValidUntil: '2026-11-14T10:00:00Z', customsNotes: 'Synthetic arithmetic evidence, not a real tariff or product.',
  recipientEvidence: { method: 'BROKER_REVIEW', reference: 'https://evidence.example.invalid/recipient', verifiedAt: '2026-11-13T10:00:00Z', validUntil: '2026-11-14T10:00:00Z', notes: 'Synthetic recipient evidence, separately validated in recipient tests.' },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('PII_ENCRYPTION_KEY', 'a'.repeat(64));
  vi.spyOn(Date, 'now').mockReturnValue(now);
  mocks.write.mockResolvedValue({ count: 1 });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('new launch-market quote enforcement', () => {
  it.each(['US', 'CN', 'JP'])('rejects a generic-rate %s quote before any quote is saved', async destination => {
    mocks.read.mockResolvedValue({ id: 'request', status: 'REVIEW_REQUIRED', version: 1, quantity: 1, destination });
    await expect(updateOperatorPurchase('request', 'operator', { action: 'quote', version: 1, review })).rejects.toMatchObject({ status: 422 });
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.event).not.toHaveBeenCalled();
  });
  it('stores the calculated fee and verified charges while still requiring recipient review', async () => {
    mocks.read.mockResolvedValue({ id: 'request', status: 'REVIEW_REQUIRED', version: 1, quantity: 1, destination: 'JP' });
    await updateOperatorPurchase('request', 'operator', { action: 'quote', version: 1, review: { ...review, verifiedImportCharges: { dutyCents: 100, taxCents: 200, clearanceCents: 50 } } });
    expect(mocks.recipient).toHaveBeenCalledOnce();
    const saved = mocks.write.mock.calls[0][0].data;
    expect(saved.quote).toMatchObject({ serviceFeeCents: 1500, serviceFeeKrw: 15000, dutyCents: 100, taxCents: 200, clearanceCents: 50, totalCents: 12350 });
    expect(openReview(saved.review, 'request')?.serviceFeeCents).toBe(1500);
    expect(saved.review).not.toHaveProperty('recipientEvidence');
  });
});
