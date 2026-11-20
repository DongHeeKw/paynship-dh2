import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { adminSettings: { findFirst: db.findFirst } } }));
import { requirePurchasingAvailable } from '../availability';
import { requireCurrentCustomsReview, CUSTOMS_REVIEW_WINDOW_MS } from '../customs-gate';
import type { StoredReview } from '../review-storage';
import { roundMoneyRatio, decimalToMinor } from '../money';
import { allocateServiceFeeKrw } from '../service-fee';

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());
describe('purchase boundary independent conditions', () => {
  it.each([
    [true, true, false, true], [true, false, false, false],
    [true, true, true, false], [false, false, false, true],
  ])('payment=%s provider=%s mock=%s available=%s', async (payment, shopifyEnabled, useMockCheckout, allowed) => {
    db.findFirst.mockResolvedValue({ maintenanceMode: false, shopifyEnabled, useMockCheckout });
    if (allowed) await expect(requirePurchasingAvailable(payment)).resolves.toBeUndefined();
    else await expect(requirePurchasingAvailable(payment)).rejects.toMatchObject({ status: 503 });
  });
  const now = Date.parse('2026-11-18T00:00:00Z');
  const valid = () => ({ destination: 'JP', rulesVerifiedAt: new Date(now).toISOString(), rulesValidUntil: new Date(now + CUSTOMS_REVIEW_WINDOW_MS).toISOString() }) as StoredReview;
  it('accepts evidence on both inclusive review boundaries', () => {
    const review = valid(); review.rulesVerifiedAt = new Date(now - CUSTOMS_REVIEW_WINDOW_MS).toISOString();
    expect(requireCurrentCustomsReview(review, 'JP', now)).toBe(review);
  });
  it.each(['invalid-verified', 'invalid-expiry', 'future-review', 'stale-review', 'expired', 'too-long'])('rejects %s independently', invalid => {
    const review = valid();
    if (invalid === 'invalid-verified') review.rulesVerifiedAt = 'invalid';
    if (invalid === 'invalid-expiry') review.rulesValidUntil = 'invalid';
    if (invalid === 'future-review') review.rulesVerifiedAt = new Date(now + 1).toISOString();
    if (invalid === 'stale-review') review.rulesVerifiedAt = new Date(now - CUSTOMS_REVIEW_WINDOW_MS - 1).toISOString();
    if (invalid === 'expired') review.rulesValidUntil = new Date(now).toISOString();
    if (invalid === 'too-long') review.rulesValidUntil = new Date(now + CUSTOMS_REVIEW_WINDOW_MS + 1).toISOString();
    expect(() => requireCurrentCustomsReview(review, 'JP', now)).toThrow();
  });
  it.each([[-1n, 1n], [1n, 0n], [1n, -1n]])('rejects invalid monetary ratio %s / %s', (n, d) => {
    expect(() => roundMoneyRatio(n, d)).toThrow('Invalid monetary ratio');
  });
  it('rounds half units once at the supported currency boundary', () => {
    expect(roundMoneyRatio(1n, 2n)).toBe(1);
    expect(decimalToMinor('1.5', 0)).toBe(2); expect(decimalToMinor('1.05', 2)).toBe(105);
    expect(() => decimalToMinor('1', 3)).toThrow('Unsupported currency precision');
  });
  it.each([0, 101])('rejects %s fee allocation lines', count => {
    expect(() => allocateServiceFeeKrw(Array.from({ length: count }, (_, i) => ({ id: String(i), subtotalKrw: 1 })))).toThrow();
  });
  it('rejects a combined subtotal above the order limit', () => {
    expect(() => allocateServiceFeeKrw([{ id: 'a', subtotalKrw: 500000001 }, { id: 'b', subtotalKrw: 500000000 }])).toThrow('service limit');
  });
});
