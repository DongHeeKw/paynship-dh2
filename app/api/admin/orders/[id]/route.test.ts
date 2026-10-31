import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/api/auth-middleware', () => ({
  requireAdminForApi: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/shopify', () => ({
  detectShippingCompany: vi.fn(),
  fulfillOrder: vi.fn(),
  isShopifyEnabled: vi.fn(),
  updateFulfillmentTracking: vi.fn(),
}));

import { PATCH } from './route';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { prisma } from '@/lib/db/prisma';
import {
  detectShippingCompany,
  fulfillOrder,
  isShopifyEnabled,
  updateFulfillmentTracking,
} from '@/lib/shopify';

describe('PATCH /api/admin/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: { id: 'admin-1' } as any,
      isAdmin: true,
    });
    vi.mocked(detectShippingCompany).mockReturnValue('DHL');
  });

  it('creates Shopify fulfillment when SHIPPING + tracking number are provided', async () => {
    vi.mocked(prisma.order.findUnique)
      .mockResolvedValueOnce({
        id: 'order-1',
        status: 'PENDING_SHIPPING_PAYMENT',
        trackingNumber: null,
        shopifyOrderId: '123456789',
        shopifyFulfillmentId: null,
      } as any)
      .mockResolvedValueOnce({
        id: 'order-1',
        status: 'SHIPPING',
        trackingNumber: '1234567890',
        shopifyOrderId: '123456789',
        shopifyFulfillmentId: 'ful-123',
      } as any);

    vi.mocked(isShopifyEnabled).mockResolvedValue(true);
    vi.mocked(fulfillOrder).mockResolvedValue({
      fulfillmentId: 'ful-123',
      status: 'SUCCESS',
    } as any);

    const request = new Request('http://localhost/api/admin/orders/order-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'SHIPPING',
        trackingNumber: '1234567890',
      }),
    }) as any;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'order-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(fulfillOrder).toHaveBeenCalledWith('order-1', {
      trackingNumber: '1234567890',
      company: 'DHL',
      notifyCustomer: true,
    });
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(json.shopifySync).toMatchObject({
      attempted: true,
      synced: true,
      mode: 'create_fulfillment',
    });
  });

  it('updates existing Shopify fulfillment tracking when fulfillment ID exists', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-2',
      status: 'SHIPPING',
      trackingNumber: 'OLD-TRACK',
      shopifyOrderId: '987654321',
      shopifyFulfillmentId: 'ful-555',
    } as any);

    vi.mocked(isShopifyEnabled).mockResolvedValue(true);
    vi.mocked(updateFulfillmentTracking).mockResolvedValue();
    vi.mocked(prisma.order.update).mockResolvedValue({
      id: 'order-2',
      status: 'SHIPPING',
      trackingNumber: '1Z999AA10123456784',
      shopifyOrderId: '987654321',
      shopifyFulfillmentId: 'ful-555',
    } as any);

    const request = new Request('http://localhost/api/admin/orders/order-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'SHIPPING',
        trackingNumber: '1Z999AA10123456784',
      }),
    }) as any;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'order-2' }),
    });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(updateFulfillmentTracking).toHaveBeenCalledWith(
      'ful-555',
      {
        number: '1Z999AA10123456784',
        company: 'DHL',
      },
      true
    );
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-2' },
      data: {
        status: 'SHIPPING',
        trackingNumber: '1Z999AA10123456784',
      },
    });
    expect(json.shopifySync).toMatchObject({
      attempted: true,
      synced: true,
      mode: 'update_tracking',
    });
  });

  it('returns 502 and does not apply local update when Shopify fulfillment sync fails', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-3',
      status: 'PENDING_SHIPPING_PAYMENT',
      trackingNumber: null,
      shopifyOrderId: '4455667788',
      shopifyFulfillmentId: null,
    } as any);
    vi.mocked(isShopifyEnabled).mockResolvedValue(true);
    vi.mocked(fulfillOrder).mockRejectedValue(new Error('No open fulfillment order found'));

    const request = new Request('http://localhost/api/admin/orders/order-3', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'SHIPPING',
        trackingNumber: 'TRACK-FAIL-01',
      }),
    }) as any;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'order-3' }),
    });
    const json = await response.json();

    expect(response.status).toBe(502);
    expect(json.error).toBe('Shopify fulfillment sync failed');
    expect(prisma.order.update).not.toHaveBeenCalled();
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

    const request = new Request('http://localhost/api/admin/orders/order-4', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'PROCESSING',
      }),
    }) as any;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'order-4' }),
    });

    expect(response.status).toBe(403);
  });

  it('blocks invalid status transitions with 409', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-5',
      status: 'PENDING',
      trackingNumber: null,
      shopifyOrderId: '111222333',
      shopifyFulfillmentId: null,
    } as any);

    const request = new Request('http://localhost/api/admin/orders/order-5', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'DELIVERED',
      }),
    }) as any;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'order-5' }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.code).toBe('ORDER_TRANSITION_INVALID');
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('requires tracking when moving into SHIPPING', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'order-6',
      status: 'PENDING_SHIPPING_PAYMENT',
      trackingNumber: null,
      shopifyOrderId: '111222334',
      shopifyFulfillmentId: null,
    } as any);

    const request = new Request('http://localhost/api/admin/orders/order-6', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'SHIPPING',
      }),
    }) as any;

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'order-6' }),
    });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.code).toBe('ORDER_TRACKING_REQUIRED');
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
