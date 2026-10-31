import { decryptPii, encryptPii } from './pii';
import type { PurchaseReview } from './review-schema';
import { PurchaseError } from './errors';

export type StoredReview = PurchaseReview & { destination: string; reviewedBy: string; reviewedAt: string };

export function sealReview(review: StoredReview, requestId: string) {
  return { ciphertext: encryptPii(review, `review:${requestId}`) };
}

export function openReview(value: unknown, requestId: string): StoredReview | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || typeof (value as { ciphertext?: unknown }).ciphertext !== 'string') {
    throw new PurchaseError(503, 'Existing review data requires a controlled encryption migration.');
  }
  return decryptPii<StoredReview>((value as { ciphertext: string }).ciphertext, `review:${requestId}`);
}
