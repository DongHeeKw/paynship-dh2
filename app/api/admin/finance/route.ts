/**
 * Admin Finance API
 *
 * Financial reporting dashboard: revenue, refunds, order AOV, procurement costs.
 *
 * GET /api/admin/finance?period=today|7d|30d
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { MOCK_SHOPIFY_ORDER_PREFIX } from '@/lib/orders/demo';

export const runtime = 'nodejs';

type Period = 'today' | '7d' | '30d';

function getPeriodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case 'today': {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') ?? '30d') as Period;

    if (!['today', '7d', '30d'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use: today, 7d, 30d' }, { status: 400 });
    }

    const since = getPeriodStart(period);

    // Real orders only (exclude demo/mock)
    const realOrderWhere: Prisma.OrderWhereInput = {
      OR: [
        { shopifyOrderId: null },
        { shopifyOrderId: { not: { startsWith: MOCK_SHOPIFY_ORDER_PREFIX } } },
      ],
    };

    const [
      revenueAggregate,
      allPeriodOrders,
      orderCountByStatus,
      procurementCosts,
    ] = await Promise.all([
      // Total revenue from paid orders (phase1TotalUsd)
      prisma.order.aggregate({
        where: {
          ...realOrderWhere,
          status: { in: ['PURCHASED', 'WAREHOUSE_RECEIVED', 'PENDING_SHIPPING_PAYMENT', 'SHIPPING', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: since },
        },
        _sum: {
          phase1TotalUsd: true,
          phase2TotalUsd: true,
        },
        _count: true,
        _avg: {
          phase1TotalUsd: true,
        },
      }),

      // All orders in period for refund counting
      prisma.order.findMany({
        where: {
          ...realOrderWhere,
          createdAt: { gte: since },
        },
        select: {
          id: true,
          status: true,
          phase1TotalUsd: true,
          phase2TotalUsd: true,
        },
      }),

      // Order count by status (raw counts)
      prisma.order.groupBy({
        by: ['status'],
        where: {
          ...realOrderWhere,
          createdAt: { gte: since },
        },
        _count: true,
      }),

      // Procurement costs (lowestPriceKrw as proxy for actual cost)
      prisma.procurementTask.aggregate({
        where: {
          createdAt: { gte: since },
          lowestPriceKrw: { not: null },
        },
        _sum: { lowestPriceKrw: true },
        _count: true,
      }),
    ]);

    const refundOrders = allPeriodOrders.filter(
      o => o.status === 'REFUND_PENDING' || o.status === 'CANCELLED'
    );
    const totalRefundsUsd = refundOrders.reduce(
      (sum, o) => sum + (o.phase1TotalUsd ?? 0) + (o.phase2TotalUsd ?? 0),
      0
    );

    const statusCounts: Record<string, number> = {};
    for (const row of orderCountByStatus) {
      statusCounts[row.status] = row._count;
    }

    return NextResponse.json({
      period,
      since: since.toISOString(),
      revenue: {
        phase1TotalUsd: revenueAggregate._sum.phase1TotalUsd ?? 0,
        phase2TotalUsd: revenueAggregate._sum.phase2TotalUsd ?? 0,
        totalUsd:
          (revenueAggregate._sum.phase1TotalUsd ?? 0) +
          (revenueAggregate._sum.phase2TotalUsd ?? 0),
        orderCount: revenueAggregate._count,
        averageOrderValueUsd: revenueAggregate._avg.phase1TotalUsd ?? 0,
      },
      refunds: {
        totalRefundsUsd: Math.round(totalRefundsUsd * 100) / 100,
        refundOrderCount: refundOrders.length,
      },
      ordersByStatus: statusCounts,
      procurement: {
        totalCostKrw: procurementCosts._sum.lowestPriceKrw ?? 0,
        taskCount: procurementCosts._count,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin Finance] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
