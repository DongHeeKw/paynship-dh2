/**
 * Admin SLA Monitoring API
 *
 * GET /api/admin/sla
 *
 * Returns:
 * - Average time spent in each order status transition
 * - Orders breaching SLA thresholds
 * - Overall SLA compliance rate
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { MOCK_SHOPIFY_ORDER_PREFIX } from '@/lib/orders/demo';

export const runtime = 'nodejs';

// SLA thresholds in milliseconds
const SLA_THRESHOLDS = {
  PURCHASED: 48 * 60 * 60 * 1000,                    // 48h: PURCHASED → WAREHOUSE_RECEIVED
  WAREHOUSE_RECEIVED: 24 * 60 * 60 * 1000,            // 24h: WAREHOUSE_RECEIVED → phase2 requested
  PENDING_SHIPPING_PAYMENT: 3 * 24 * 60 * 60 * 1000,  // 3 days: payment pending
  SHIPPING: 14 * 24 * 60 * 60 * 1000,                 // 14 days: SHIPPING → DELIVERED
} as const;

function msToHours(ms: number): number {
  return Math.round((ms / 3_600_000) * 10) / 10;
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length / 3_600_000) * 10) / 10;
}

export async function GET() {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const now = new Date();

    const realOrderWhere: Prisma.OrderWhereInput = {
      OR: [
        { shopifyOrderId: null },
        { shopifyOrderId: { not: { startsWith: MOCK_SHOPIFY_ORDER_PREFIX } } },
      ],
      status: {
        notIn: ['PENDING_PAYMENT', 'CANCELLED'],
      },
    };

    // Fetch orders with all relevant timestamps
    const orders = await prisma.order.findMany({
      where: realOrderWhere,
      select: {
        id: true,
        status: true,
        createdAt: true,
        phase1PaidAt: true,
        warehouseReceivedAt: true,
        phase2RequestedAt: true,
        phase2PaidAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Performance limit
    });

    // ── Duration buckets ─────────────────────────────────────────────────────

    // PURCHASED → WAREHOUSE_RECEIVED
    const purchasedToWarehouse: number[] = [];
    // WAREHOUSE_RECEIVED → phase2 requested
    const warehouseToPhase2: number[] = [];
    // PENDING_SHIPPING_PAYMENT → phase2 paid
    const phase2RequestToPayment: number[] = [];
    // phase2 paid → DELIVERED (updatedAt as proxy for terminal status change)
    const shippingToDelivery: number[] = [];

    // SLA breaches — currently stuck orders
    const breaches: Array<{
      orderId: string;
      status: string;
      currentDurationHours: number;
      thresholdHours: number;
      overdueHours: number;
    }> = [];

    for (const order of orders) {
      const paidAt = order.phase1PaidAt ?? order.createdAt;

      // Duration: PURCHASED → WAREHOUSE_RECEIVED
      if (order.warehouseReceivedAt) {
        purchasedToWarehouse.push(order.warehouseReceivedAt.getTime() - paidAt.getTime());
      } else if (order.status === 'PURCHASED') {
        const elapsed = now.getTime() - paidAt.getTime();
        if (elapsed > SLA_THRESHOLDS.PURCHASED) {
          breaches.push({
            orderId: order.id,
            status: order.status,
            currentDurationHours: msToHours(elapsed),
            thresholdHours: msToHours(SLA_THRESHOLDS.PURCHASED),
            overdueHours: msToHours(elapsed - SLA_THRESHOLDS.PURCHASED),
          });
        }
      }

      // Duration: WAREHOUSE_RECEIVED → phase2 requested
      if (order.warehouseReceivedAt && order.phase2RequestedAt) {
        warehouseToPhase2.push(
          order.phase2RequestedAt.getTime() - order.warehouseReceivedAt.getTime()
        );
      } else if (order.status === 'WAREHOUSE_RECEIVED' && order.warehouseReceivedAt) {
        const elapsed = now.getTime() - order.warehouseReceivedAt.getTime();
        if (elapsed > SLA_THRESHOLDS.WAREHOUSE_RECEIVED) {
          breaches.push({
            orderId: order.id,
            status: order.status,
            currentDurationHours: msToHours(elapsed),
            thresholdHours: msToHours(SLA_THRESHOLDS.WAREHOUSE_RECEIVED),
            overdueHours: msToHours(elapsed - SLA_THRESHOLDS.WAREHOUSE_RECEIVED),
          });
        }
      }

      // Duration: PENDING_SHIPPING_PAYMENT → phase2 paid
      if (order.phase2RequestedAt && order.phase2PaidAt) {
        phase2RequestToPayment.push(
          order.phase2PaidAt.getTime() - order.phase2RequestedAt.getTime()
        );
      } else if (order.status === 'PENDING_SHIPPING_PAYMENT' && order.phase2RequestedAt) {
        const elapsed = now.getTime() - order.phase2RequestedAt.getTime();
        if (elapsed > SLA_THRESHOLDS.PENDING_SHIPPING_PAYMENT) {
          breaches.push({
            orderId: order.id,
            status: order.status,
            currentDurationHours: msToHours(elapsed),
            thresholdHours: msToHours(SLA_THRESHOLDS.PENDING_SHIPPING_PAYMENT),
            overdueHours: msToHours(elapsed - SLA_THRESHOLDS.PENDING_SHIPPING_PAYMENT),
          });
        }
      }

      // Duration: SHIPPING (phase2 paid) → DELIVERED (updatedAt proxy)
      if (order.phase2PaidAt && order.status === 'DELIVERED') {
        shippingToDelivery.push(order.updatedAt.getTime() - order.phase2PaidAt.getTime());
      } else if (order.status === 'SHIPPING' && order.phase2PaidAt) {
        const elapsed = now.getTime() - order.phase2PaidAt.getTime();
        if (elapsed > SLA_THRESHOLDS.SHIPPING) {
          breaches.push({
            orderId: order.id,
            status: order.status,
            currentDurationHours: msToHours(elapsed),
            thresholdHours: msToHours(SLA_THRESHOLDS.SHIPPING),
            overdueHours: msToHours(elapsed - SLA_THRESHOLDS.SHIPPING),
          });
        }
      }
    }

    // SLA compliance: active orders not in breach
    const activeOrders = orders.filter(
      o => !['DELIVERED', 'CANCELLED', 'REFUND_PENDING'].includes(o.status)
    );
    const complianceRate =
      activeOrders.length === 0
        ? 1
        : Math.round(
            ((activeOrders.length - breaches.length) / activeOrders.length) * 1000
          ) / 1000;

    return NextResponse.json({
      averageDurationsHours: {
        purchasedToWarehouseReceived: avg(purchasedToWarehouse),
        warehouseReceivedToPhase2Requested: avg(warehouseToPhase2),
        pendingShippingPaymentToPaid: avg(phase2RequestToPayment),
        shippingToDelivered: avg(shippingToDelivery),
      },
      slaThresholdsHours: {
        PURCHASED: msToHours(SLA_THRESHOLDS.PURCHASED),
        WAREHOUSE_RECEIVED: msToHours(SLA_THRESHOLDS.WAREHOUSE_RECEIVED),
        PENDING_SHIPPING_PAYMENT: msToHours(SLA_THRESHOLDS.PENDING_SHIPPING_PAYMENT),
        SHIPPING: msToHours(SLA_THRESHOLDS.SHIPPING),
      },
      breaches,
      breachCount: breaches.length,
      activeOrderCount: activeOrders.length,
      complianceRate,
      compliancePercent: Math.round(complianceRate * 100),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin SLA] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
