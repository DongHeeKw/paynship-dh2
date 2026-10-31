/**
 * Stuck Orders Detection API
 *
 * GET /api/admin/orders/stuck
 * Returns orders that have been stuck in a status for longer than expected.
 *
 * Thresholds:
 * - PURCHASED: > 48 hours (not procured)
 * - PENDING_SHIPPING_PAYMENT: > 72 hours (not paid Phase 2)
 * - WAREHOUSE_RECEIVED: > 24 hours (not shipped)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi } from '@/lib/api/auth-middleware';

const STUCK_THRESHOLDS: { status: string; maxHours: number; reason: string }[] = [
  { status: 'PURCHASED', maxHours: 48, reason: '구매 후 48시간 미처리' },
  { status: 'PENDING_SHIPPING_PAYMENT', maxHours: 72, reason: '배송비 결제 3일 초과' },
  { status: 'WAREHOUSE_RECEIVED', maxHours: 24, reason: '창고 입고 후 24시간 미발송' },
];

export async function GET() {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const now = new Date();
    const stuckOrders: {
      id: string;
      status: string;
      stuckReason: string;
      stuckHours: number;
      productName: string | null;
      createdAt: string;
      updatedAt: string;
    }[] = [];

    for (const threshold of STUCK_THRESHOLDS) {
      const cutoff = new Date(now.getTime() - threshold.maxHours * 60 * 60 * 1000);

      const orders = await prisma.order.findMany({
        where: {
          status: threshold.status as never,
          updatedAt: { lte: cutoff },
        },
        include: {
          quote: {
            select: { productName: true },
          },
        },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      });

      for (const order of orders) {
        const stuckMs = now.getTime() - order.updatedAt.getTime();
        const stuckHours = Math.floor(stuckMs / (1000 * 60 * 60));

        stuckOrders.push({
          id: order.id,
          status: order.status,
          stuckReason: threshold.reason,
          stuckHours,
          productName: order.quote?.productName ?? null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        });
      }
    }

    // Sort by stuckHours descending (most urgent first)
    stuckOrders.sort((a, b) => b.stuckHours - a.stuckHours);

    return NextResponse.json({
      orders: stuckOrders,
      total: stuckOrders.length,
    });
  } catch (error) {
    console.error('[Stuck Orders Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch stuck orders' },
      { status: 500 }
    );
  }
}
