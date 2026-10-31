import { afterEach, describe, expect, it, vi } from 'vitest';
import { encryptPii, decryptPii } from '../pii';
import { readPurchaseBody, purchaseApiError } from '../api';
import { purchaseEventFields, purchaseEventMessage } from '../event-record';
import { sealReview, openReview, type StoredReview } from '../review-storage';

afterEach(() => vi.unstubAllEnvs());

describe('private customer information', () => {
  it('encrypts operator notes and review evidence with record-bound contexts', () => {
    vi.stubEnv('PII_ENCRYPTION_KEY', 'a'.repeat(64));
    const event = purchaseEventFields('request-a', 'operator', 'operator', 'ON_HOLD', 'Private recipient document reference');
    expect(event.message).not.toContain('Private recipient');
    expect(purchaseEventMessage('request-a', event)).toBe('Private recipient document reference');
    expect(() => purchaseEventMessage('request-b', event)).toThrow();
    const review = { customsNotes: 'Private evidence reference' } as StoredReview;
    const sealed = sealReview(review, 'request-a');
    expect(JSON.stringify(sealed)).not.toContain('Private evidence');
    expect(openReview(sealed, 'request-a')).toEqual(review);
    expect(() => openReview(sealed, 'request-b')).toThrow();
  });
  it('encrypts with random IVs and binds records to their owner/context', () => {
    vi.stubEnv('PII_ENCRYPTION_KEY', 'a'.repeat(64));
    const data = { name: 'Customer', customsId: 'TEST-123', address1: 'Private address' };
    const first = encryptPii(data, 'profile:user-a');
    expect(first).not.toContain('Private address');
    expect(encryptPii(data, 'profile:user-a')).not.toBe(first);
    expect(decryptPii(first, 'profile:user-a')).toEqual(data);
    expect(() => decryptPii(first, 'profile:user-b')).toThrow();
    const parts = first.split('.'); const bytes = Buffer.from(parts[3], 'base64'); bytes[0] ^= 1; parts[3] = bytes.toString('base64');
    expect(() => decryptPii(parts.join('.'), 'profile:user-a')).toThrow();
  });
  it('fails closed when the storage key is missing', () => {
    vi.stubEnv('PII_ENCRYPTION_KEY', '');
    expect(() => encryptPii({ address: 'private' }, 'x')).toThrow('not configured');
  });
  it('bounds the body even without a Content-Length header', async () => {
    const request = new Request('http://localhost/api/purchases', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(9000) }) });
    await expect(readPurchaseBody(request)).rejects.toMatchObject({ status: 413 });
  });
  it('does not expose database or secret errors', async () => {
    const response = purchaseApiError(new Error('postgres://secret customer address TEST-123'));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('secret');
  });
});
