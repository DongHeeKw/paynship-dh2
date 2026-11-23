import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PurchaseError } from '@/lib/purchases/errors';
const mock = vi.hoisted(() => ({ auth: vi.fn(), home: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/purchases/auth', () => ({ purchaseUser: mock.auth }));
vi.mock('@/lib/purchases/home-orders', () => ({ getHomeOrdersForUser: mock.home }));
vi.mock('@/lib/purchases/read', () => ({ listPurchasesForUser: mock.list }));
vi.mock('@/lib/purchases/create', () => ({ createPurchase: vi.fn() }));
import { GET } from '../route';
beforeEach(() => vi.resetAllMocks());
it('derives home ownership from authenticated session and disables response caching', async () => {
  mock.auth.mockResolvedValue({ id: 'session-owner' });
  mock.home.mockResolvedValue({ activeCount: 0, attentionCount: 0, orders: [] });
  const response = await GET(new NextRequest('http://localhost/api/purchases?view=home&userId=other-owner'));
  expect(response.status).toBe(200);
  expect(mock.home).toHaveBeenCalledWith('session-owner');
  expect(mock.list).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('refuses guest summaries before the database loader runs', async () => {
  mock.auth.mockRejectedValue(new PurchaseError(401, 'Authentication required.'));
  const response = await GET(new NextRequest('http://localhost/api/purchases?view=home'));
  expect(response.status).toBe(401); expect(mock.home).not.toHaveBeenCalled();
});
