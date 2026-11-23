import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn() }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { purchaseRequest: db } }));
import { getHomeOrdersForUser } from '../home-orders';
const row = (id: string, status: string) => ({ id, status, category: 'books', quantity: 1, destination: 'JP',
  quoteExpiresAt: new Date('2026-11-25T00:00:00Z'), updatedAt: new Date('2026-11-22T00:00:00Z'),
  events: [{ createdAt: new Date('2026-11-21T00:00:00Z'), source: 'operator' }],
  // Accidental extra fields must not escape the home DTO.
  options: 'private', deliverySnapshot: 'private', userId: 'owner', quote: { address: 'private' },
});
beforeEach(() => { vi.resetAllMocks(); db.count.mockResolvedValue(4); });
describe('owned active-order home summary', () => {
  it('prioritizes attention and keeps the result bounded and free of private fields', async () => {
    db.findMany.mockResolvedValueOnce([row('held', 'ON_HOLD')]).mockResolvedValueOnce([row('shipping', 'SHIPPED')]);
    const result = await getHomeOrdersForUser('owner', '2026-11-22T00:00:00Z');
    expect(result.orders.map((order) => order.id)).toEqual(['held', 'shipping']);
    expect(result.orders[0].action).toBe('Check what needs attention');
    expect(result.orders[1].lastEventAt).toBe('2026-11-21T00:00:00.000Z');
    expect(JSON.stringify(result)).not.toContain('private');
    for (const [args] of db.findMany.mock.calls) {
      expect(args.where.userId).toBe('owner'); expect(args.take).toBe(3);
      expect(args.select.options).toBeUndefined(); expect(args.select.deliverySnapshot).toBeUndefined();
    }
    for (const [args] of db.count.mock.calls) expect(args.where.userId).toBe('owner');
  });
  it('does not describe expired quotes as ready to pay or invent tracking timestamps', async () => {
    db.findMany.mockResolvedValueOnce([{ ...row('quote', 'QUOTED'), events: [] }]).mockResolvedValueOnce([]);
    const result = await getHomeOrdersForUser('owner', '2026-11-25T00:00:00Z');
    expect(result.orders[0]).toMatchObject({ action: 'Check quote validity', lastEventAt: null });
  });
  it('does not query without an authenticated owner', async () => {
    await expect(getHomeOrdersForUser('')).rejects.toThrow('Authentication required');
    expect(db.findMany).not.toHaveBeenCalled();
  });
});
