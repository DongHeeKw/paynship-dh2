/**
 * Orders API
 * GET - List orders for the authenticated user
 * POST - Deprecated (webhook-driven only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/api/auth-middleware';
import logger from '@/lib/utils/logger';
import { isDemoShopifyOrderId } from '@/lib/orders/demo';

export interface OrderSummary {
  id: string;
  status: string;
  isDemo: boolean;
  productName: string | null;
  productImage: string | null;
  totalUsd: number;
  trackingNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/orders
 * List orders for the authenticated user
 * Supports cursor-based pagination
 *
 * Query params:
 * - cursor: Order ID to start from (optional)
 * - limit: Number of orders to return (default: 20, max: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, isGuest } = await getAuthUser();

    if (isGuest || !user) {
      return NextResponse.json({
        orders: [],
        nextCursor: null,
        hasMore: false,
        message: '로그인이 필요합니다',
      });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam || '20', 10) || 20, 1), 50);

    const orders = await prisma.order.findMany({
      where: {
        quote: {
          userId: user.id,
        },
      },
      include: {
        quote: {
          select: {
            productName: true,
            productSnapshot: true,
            totalUsd: true,
            destinationCountry: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor item itself
      }),
    });

    // Check if there are more items
    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, -1) : orders;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const summaries: OrderSummary[] = items.map(order => {
      const snapshot = order.quote?.productSnapshot as { imageUrl?: string } | null;
      return {
        id: order.id,
        status: order.status,
        isDemo: isDemoShopifyOrderId(order.shopifyOrderId),
        productName: order.quote?.productName ?? null,
        productImage: snapshot?.imageUrl || null,
        totalUsd: order.quote?.totalUsd ?? 0,
        trackingNumber: order.trackingNumber,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });

    return NextResponse.json({
      orders: summaries,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    logger.error('Orders GET', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Deprecated: order creation is webhook-driven after successful payment.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, isGuest } = await getAuthUser();
    if (isGuest || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: '주문 생성은 Shopify 결제 완료 웹훅(orders/paid)에서 자동 처리됩니다.',
        code: 'ORDER_CREATION_WEBHOOK_ONLY',
      },
      { status: 405 }
    );
  } catch (error) {
    return handleApiError(error, 'Orders POST', 'Failed to create order');
  }
}
