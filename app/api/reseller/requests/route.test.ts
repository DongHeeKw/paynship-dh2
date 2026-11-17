import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PurchaseError } from '@/lib/purchases/errors';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), list: vi.fn() }));
vi.mock('@/features/reseller/core/auth', () => ({ resellerUser: mocks.auth }));
vi.mock('@/lib/purchases/create', () => ({ createPurchase: mocks.create }));
vi.mock('@/lib/purchases/read', () => ({ listPurchasesForUser: mocks.list }));
import { GET, POST } from './route';
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ id: 'verified-owner' }); });
it('passes verified ownership and body through the shared purchase flow', async () => {
  mocks.create.mockResolvedValue({ id: 'request', status: 'REVIEW_REQUIRED' });
  const payload = { sourceUrl: 'https://www.yes24.com/product/goods/109196213', category: 'collectibles', quantity: 1, idempotencyKey: 'c78e7509-ad3b-48df-8f35-58587906cc34' };
  const response = await POST(new Request('https://example.com/api/reseller/requests', { method: 'POST', body: JSON.stringify(payload) }));
  expect(response.status).toBe(201);
  expect(mocks.create).toHaveBeenCalledWith('verified-owner', payload);
});
it('lists only the verified account and validates cursors before persistence', async () => {
  mocks.list.mockResolvedValue({ requests: [], nextCursor: null });
  expect((await GET(new NextRequest('https://example.com/api/reseller/requests'))).status).toBe(200);
  expect(mocks.list).toHaveBeenCalledWith('verified-owner', undefined);
  mocks.list.mockClear();
  expect((await GET(new NextRequest('https://example.com/api/reseller/requests?cursor=other-user'))).status).toBe(400);
  expect(mocks.list).not.toHaveBeenCalled();
});
it('never accesses persistence when authentication fails', async () => {
  mocks.auth.mockRejectedValue(new PurchaseError(401, 'Verified token required.'));
  expect((await POST(new Request('https://example.com', { method: 'POST', body: '{}' }))).status).toBe(401);
  expect(mocks.create).not.toHaveBeenCalled();
});
it('enforces the streaming body bound even without a content-length header', async () => {
  expect((await POST(new Request('https://example.com', { method: 'POST', body: 'x'.repeat(8193) }))).status).toBe(413);
  expect(mocks.create).not.toHaveBeenCalled();
});
