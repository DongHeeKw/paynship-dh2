import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth/helpers', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    quote: {
      findUnique: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
    shopifyWebhookEvent: {
      findFirst: vi.fn(),
    },
  },
}));

import { GET } from './route';
import { getAuthUser } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';

describe('GET /api/orders/payment-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for guest users', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({
      user: null,
      isGuest: true,
      error: null,
    } as any);

    const request = new NextRequest('http://localhost/api/orders/payment-status?quoteId=fd313f16-ff84-40dc-95b0-21376f5e2f81');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('returns ORDER_CONFIRMED when order exists', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({
      user: { id: 'user-1' },
      isGuest: false,
      error: null,
    } as any);
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      id: 'fd313f16-ff84-40dc-95b0-21376f5e2f81',
      userId: 'user-1',
      createdAt: new Date('2026-02-19T00:00:00.000Z'),
    } as any);
    vi.mocked(prisma.order.findFirst).mockResolvedValue({
      id: 'order-1',
      status: 'PAID',
      shopifyOrderId: 'shopify_123',
      createdAt: new Date('2026-02-19T00:01:00.000Z'),
      updatedAt: new Date('2026-02-19T00:01:30.000Z'),
    } as any);
    vi.mocked(prisma.shopifyWebhookEvent.findFirst).mockResolvedValue(null as any);

    const request = new NextRequest('http://localhost/api/orders/payment-status?quoteId=fd313f16-ff84-40dc-95b0-21376f5e2f81');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.state).toBe('ORDER_CONFIRMED');
    expect(json.order.id).toBe('order-1');
  });

  it('returns WEBHOOK_FAILED when paid webhook processing failed', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({
      user: { id: 'user-1' },
      isGuest: false,
      error: null,
    } as any);
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      id: 'fd313f16-ff84-40dc-95b0-21376f5e2f81',
      userId: 'user-1',
      createdAt: new Date('2026-02-19T00:00:00.000Z'),
    } as any);
    vi.mocked(prisma.order.findFirst).mockResolvedValue(null as any);
    vi.mocked(prisma.shopifyWebhookEvent.findFirst).mockResolvedValue({
      id: 'wh-1',
      processingStatus: 'FAILED',
      correlationStatus: 'CORRELATED',
      httpStatus: 500,
      errorMessage: 'handler failed',
      createdAt: new Date('2026-02-19T00:01:00.000Z'),
      processedAt: new Date('2026-02-19T00:01:01.000Z'),
    } as any);

    const request = new NextRequest('http://localhost/api/orders/payment-status?quoteId=fd313f16-ff84-40dc-95b0-21376f5e2f81');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.state).toBe('WEBHOOK_FAILED');
    expect(json.latestPaidWebhook.processingStatus).toBe('FAILED');
  });
});
