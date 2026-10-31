/**
 * Admin Orders API
 *
 * 주문 목록 조회 (페이지네이션, 필터링)
 * Order → Quote 관계에서 가격/배송 정보를 가져옴
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { MOCK_SHOPIFY_ORDER_PREFIX, isDemoShopifyOrderId } from '@/lib/orders/demo';
import { isRecord } from '@/lib/utils/type-guards';
import { logApiError } from '@/lib/api/log-error';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const mode = (searchParams.get('mode') || 'real').toLowerCase();
    const search = searchParams.get('search')?.trim() || '';

    // Build where clause (Order model only has status, not paymentStatus)
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (userId) {
      where.quote = { userId };
    } else if (search) {
      // Search across productName (from Quote), userId (from Quote)
      where.quote = {
        OR: [
          { productName: { contains: search, mode: 'insensitive' } },
          { userId: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    if (fromDate) {
      where.createdAt = { ...((where.createdAt as object) || {}), gte: new Date(fromDate) };
    }

    if (toDate) {
      where.createdAt = { ...((where.createdAt as object) || {}), lte: new Date(toDate) };
    }

    if (mode === 'demo') {
      where.shopifyOrderId = { startsWith: MOCK_SHOPIFY_ORDER_PREFIX };
    } else if (mode === 'real') {
      where.OR = [
        { shopifyOrderId: null },
        { shopifyOrderId: { not: { startsWith: MOCK_SHOPIFY_ORDER_PREFIX } } },
      ];
    }

    // Get orders with Quote relation for price/shipping info
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          quote: {
            select: {
              id: true,
              userId: true,
              productName: true,
              destinationCountry: true,
              totalUsd: true,
              cartSnapshot: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // Format response - derive data from Quote
    const formattedOrders = orders.map((order) => {
      const itemCount = getSnapshotItemCount(order.quote?.cartSnapshot);

      return {
        id: order.id,
        userId: order.quote?.userId ?? null,
        status: order.status,
        totalUsd: order.quote?.totalUsd ?? null,
        itemCount,
        shippingCountry: order.quote?.destinationCountry ?? null,
        trackingNumber: order.trackingNumber,
        isDemo: isDemoShopifyOrderId(order.shopifyOrderId),
        productName: order.quote?.productName ?? null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        mode: mode === 'demo' || mode === 'all' ? mode : 'real',
      },
    });
  } catch (error) {
    logApiError('Admin Orders GET', request, error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

function getSnapshotItemCount(snapshot: unknown): number {
  if (Array.isArray(snapshot)) {
    return snapshot.length > 0 ? snapshot.length : 1;
  }

  if (isRecord(snapshot) && Array.isArray(snapshot.items)) {
    return snapshot.items.length > 0 ? snapshot.items.length : 1;
  }

  return 1;
}

