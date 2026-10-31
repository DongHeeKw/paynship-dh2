import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PurchaseError } from '@/lib/purchases/errors';

const auth = vi.hoisted(() => vi.fn());
const list = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());
vi.mock('@/lib/purchases/auth', () => ({ purchaseUser: auth }));
vi.mock('@/lib/purchases/read', () => ({ listPurchasesForUser: list }));
vi.mock('@/lib/purchases/create', () => ({ createPurchase: create }));
import { GET, POST } from './route';

beforeEach(() => vi.resetAllMocks());
describe('private purchase endpoints', () => {
  it('does not query orders for an unauthenticated principal', async () => {
    auth.mockRejectedValue(new PurchaseError(401, 'Sign in.'));
    expect((await GET(new NextRequest('http://localhost/api/purchases'))).status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });
  it('always scopes listing to the authenticated user, ignoring a client userId', async () => {
    auth.mockResolvedValue({ id: 'authenticated-user' }); list.mockResolvedValue({ requests: [], nextCursor: null });
    const response = await GET(new NextRequest('http://localhost/api/purchases?userId=another-user'));
    expect(response.status).toBe(200); expect(list).toHaveBeenCalledWith('authenticated-user', undefined);
  });
  it('rejects oversized submissions before persistence', async () => {
    auth.mockResolvedValue({ id: 'authenticated-user' });
    const response = await POST(new Request('http://localhost/api/purchases', { method: 'POST', body: JSON.stringify({ sourceUrl: 'x'.repeat(9000) }) }));
    expect(response.status).toBe(413); expect(create).not.toHaveBeenCalled();
  });
});
