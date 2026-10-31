import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/api/auth-middleware', () => ({
  requireAdminForApi: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { prisma } from '@/lib/db/prisma';

describe('GET /api/admin/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auth error when admin check fails', async () => {
    const errorResponse = NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: null,
      isAdmin: false,
      error: errorResponse,
    });

    const request = new NextRequest('http://localhost/api/admin/orders');
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('parses itemCount from both object and array cart snapshots', async () => {
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: { id: 'admin' } as any,
      isAdmin: true,
    });

    vi.mocked(prisma.order.findMany).mockResolvedValue([
      {
        id: 'order-1',
        status: 'PAID',
        trackingNumber: null,
        createdAt: new Date('2026-02-18T00:00:00.000Z'),
        updatedAt: new Date('2026-02-18T00:00:00.000Z'),
        quote: {
          userId: 'user-1',
          productName: 'Product A',
          destinationCountry: 'US',
          totalUsd: 100,
          cartSnapshot: {
            items: [{ name: 'A', priceKrw: 10000 }, { name: 'B', priceKrw: 20000 }],
          },
        },
      },
      {
        id: 'order-2',
        status: 'PAID',
        trackingNumber: null,
        createdAt: new Date('2026-02-18T00:00:00.000Z'),
        updatedAt: new Date('2026-02-18T00:00:00.000Z'),
        quote: {
          userId: 'user-2',
          productName: 'Product B',
          destinationCountry: 'US',
          totalUsd: 50,
          cartSnapshot: [{ name: 'Legacy', priceKrw: 15000 }],
        },
      },
    ] as any);
    vi.mocked(prisma.order.count).mockResolvedValue(2 as any);

    const request = new NextRequest('http://localhost/api/admin/orders?page=1&limit=20');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.orders).toHaveLength(2);
    expect(json.orders[0].itemCount).toBe(2);
    expect(json.orders[1].itemCount).toBe(1);
  });

  it('supports demo mode filter and exposes isDemo flag', async () => {
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: { id: 'admin' } as any,
      isAdmin: true,
    });

    vi.mocked(prisma.order.findMany).mockResolvedValue([
      {
        id: 'order-demo-1',
        status: 'SHIPPED',
        trackingNumber: 'TRACK-1',
        shopifyOrderId: 'mock_order_12345',
        createdAt: new Date('2026-02-18T00:00:00.000Z'),
        updatedAt: new Date('2026-02-18T00:00:00.000Z'),
        quote: {
          userId: 'user-demo',
          productName: 'Demo Product',
          destinationCountry: 'US',
          totalUsd: 42,
          cartSnapshot: [{ name: 'Demo', priceKrw: 15000 }],
        },
      },
    ] as any);
    vi.mocked(prisma.order.count).mockResolvedValue(1 as any);

    const request = new NextRequest('http://localhost/api/admin/orders?mode=demo');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shopifyOrderId: { startsWith: 'mock_order_' },
        }),
      })
    );
    expect(json.orders[0].isDemo).toBe(true);
    expect(json.filters.mode).toBe('demo');
  });
});
