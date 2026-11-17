import { PurchaseError } from './errors';
import type { StoredReview } from './review-storage';

export const CUSTOMS_REVIEW_WINDOW_MS = 30 * 86400000;

// A recent operator review is still a manual evidence record. This validates
// its destination and dates; it never asserts legal or provider approval.
export function requireCurrentCustomsReview(review: StoredReview | null, destination: string, now = Date.now()): StoredReview {
  if (!review || review.destination !== destination) throw new PurchaseError(409, 'Current product and customs evidence for this destination is required.');
  const verified = Date.parse(review.rulesVerifiedAt);
  const expiry = Date.parse(review.rulesValidUntil);
  if (!Number.isFinite(verified) || !Number.isFinite(expiry) || verified > now || now - verified > CUSTOMS_REVIEW_WINDOW_MS || expiry <= now || expiry > now + CUSTOMS_REVIEW_WINDOW_MS) {
    throw new PurchaseError(409, 'Current product and customs evidence verified within 30 days is required. Hold and review stale evidence.');
  }
  return review;
}
