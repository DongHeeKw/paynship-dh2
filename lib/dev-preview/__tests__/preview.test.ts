import { afterEach, describe, expect, it, vi } from 'vitest';
import { devPreviewAllowed } from '../access';
import { createPreviewTransport } from '../transport';
import { previewHref } from '../navigation';

afterEach(() => { vi.unstubAllGlobals(); });

describe('local preview gate', () => {
  it.each(['localhost:3000', '127.0.0.1:3000', '[::1]:3000'])('accepts explicitly enabled local development %s', host => {
    expect(devPreviewAllowed('development', '1', host)).toBe(true);
  });
  it.each(['production', 'test', undefined])('cannot be enabled outside development (%s)', mode => {
    expect(devPreviewAllowed(mode, '1', 'localhost:3000')).toBe(false);
  });
  it.each(['localhost.attacker.test', '127.0.0.1.attacker.test', 'user@localhost', 'https://localhost', 'localhost:0', 'localhost:99999', 'example.test', 'localhost/path'])('rejects deceptive or nonlocal authority %s', host => {
    expect(devPreviewAllowed('development', '1', host)).toBe(false);
  });
  it('requires explicit opt-in', () => { expect(devPreviewAllowed('development', undefined, 'localhost:3000')).toBe(false); });
});

describe('preview transport isolation', () => {
  it('never falls back to real APIs for payment, administration or unknown routes', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); const request = createPreviewTransport();
    for (const path of ['/api/admin/purchases', '/api/webhooks/shipping', '/api/purchases/11111111-1111-4111-8111-111111111111/checkout', 'https://example.test/api/purchases']) {
      await expect(request(path, { method: 'POST', body: '{}' })).rejects.toThrow();
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps each preview session separate and does not let clients forge verification', async () => {
    const first = createPreviewTransport(); const second = createPreviewTransport();
    const { profile } = await first<{ profile: Record<string, unknown> }>('/api/delivery-profile');
    await expect(first('/api/delivery-profile', { method: 'PUT', body: JSON.stringify({ ...profile, identityVerified: true }) })).rejects.toThrow();
    await first('/api/delivery-profile', { method: 'DELETE' });
    expect(await first('/api/delivery-profile')).toEqual({ profile: null });
    expect((await second<{ profile: unknown }>('/api/delivery-profile')).profile).not.toBeNull();
  });
  it('bounds raw input instead of accepting a batch', async () => {
    const request = createPreviewTransport();
    await expect(request('/api/purchases', { method: 'POST', body: JSON.stringify({ urls: 'x'.repeat(9000) }) })).rejects.toThrow('too large');
    await expect(request('/api/purchases', { method: 'POST', body: JSON.stringify(Array(100).fill({ sourceUrl: 'https://www.yes24.com/product/goods/13137546' })) })).rejects.toThrow();
  });
  it('deduplicates a retry and keeps its new request local', async () => {
    const request = createPreviewTransport(); const input = { sourceUrl: 'https://www.yes24.com/product/goods/13137546', category: 'books', quantity: 1, options: '', idempotencyKey: crypto.randomUUID() };
    const init = { method: 'POST', body: JSON.stringify(input) };
    const first = await request<{ request: { id: string } }>('/api/purchases', init);
    expect(await request('/api/purchases', init)).toEqual(first);
    await expect(request('/api/purchases', { ...init, body: JSON.stringify({ ...input, quantity: 2 }) })).rejects.toThrow('different details');
    expect((await request<{ requests: unknown[] }>('/api/purchases')).requests).toHaveLength(3);
  });
  it('maps navigation into the same preview without accepting external or admin destinations', () => {
    expect(previewHref('/settings/delivery?next=/purchase')).toBe('/dev/preview?view=delivery&next=%2Fpurchase');
    for (const path of ['//example.test/orders', 'https://example.test/', '/admin/purchases', '/orders/../admin']) expect(() => previewHref(path)).toThrow();
  });
});
