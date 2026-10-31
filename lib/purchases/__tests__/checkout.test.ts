import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptPii } from '../pii';
import { sealReview, type StoredReview } from '../review-storage';

const mocks = vi.hoisted(() => ({ read: vi.fn(), claim: vi.fn(), event: vi.fn(), provider: vi.fn(), availability: vi.fn(), quota: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
vi.mock('../transaction', () => ({ purchaseTransaction: (fn: (tx: unknown) => unknown) => fn({
  purchaseRequest: { findFirst: mocks.read, updateMany: mocks.claim }, purchaseEvent: { create: mocks.event },
}) }));
vi.mock('../payment-provider', () => ({ paymentProviderConfig: vi.fn(), createHostedPayment: mocks.provider }));
vi.mock('../availability', () => ({ requirePurchasingAvailable: mocks.availability }));
vi.mock('../quota', () => ({ consumeQuota: mocks.quota }));
import { purchaseCheckout } from '../checkout';

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('PII_ENCRYPTION_KEY', 'a'.repeat(64)); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const id = 'request';
const now = Date.parse('2026-10-12T00:00:00Z');
function request() {
  return { id, userId: 'owner', destination: 'TW', status: 'QUOTED', version: 2, quote: { totalCents: 1200 }, quoteExpiresAt: new Date(now + 3600000),
    review: sealReview({ rulesValidUntil: new Date(now + 3600000).toISOString(), recipientEvidence: { method: 'BROKER_REVIEW',
      reference: 'https://broker.example.invalid/evidence', verifiedAt: new Date(now - 60000).toISOString(), validUntil: new Date(now - 1).toISOString(), notes: 'Expired authorization review example.' } } as StoredReview, id),
    encryptedDelivery: encryptPii({ fullName: 'Example', phone: '+886912345678', address1: 'Sample street', city: 'Taipei', country: 'TW', postalCode: '100', customsAuthorization: 'BROKER' }, `request:${id}`) };
}

describe('payment authorization boundary', () => {
  it('does not expose a checkout for another customer', async () => {
    mocks.read.mockResolvedValue(null);
    await expect(purchaseCheckout(id, 'attacker', 'example@example.invalid', { version: 2 })).rejects.toMatchObject({ status: 404 });
    expect(mocks.read).toHaveBeenCalledWith({ where: { id, userId: 'attacker' } }); expect(mocks.provider).not.toHaveBeenCalled();
  });
  it('refuses missing review evidence before creating an external checkout', async () => {
    mocks.read.mockResolvedValue({ ...request(), review: null });
    await expect(purchaseCheckout(id, 'owner', 'example@example.invalid', { version: 2 })).rejects.toMatchObject({ status: 409 });
    expect(mocks.claim).not.toHaveBeenCalled(); expect(mocks.provider).not.toHaveBeenCalled();
  });
  it('refuses expired recipient evidence even while the quote is unexpired', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    mocks.read.mockResolvedValue(request());
    await expect(purchaseCheckout(id, 'owner', 'example@example.invalid', { version: 2 })).rejects.toMatchObject({ status: 422 });
    expect(mocks.claim).not.toHaveBeenCalled(); expect(mocks.provider).not.toHaveBeenCalled();
  });
});
