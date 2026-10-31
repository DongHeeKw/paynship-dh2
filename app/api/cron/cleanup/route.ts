import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { OrderStatus } from '@prisma/client';
import logger from '@/lib/utils/logger';
import { sendOpsAlert } from '@/lib/ops/alerting';

const STUCK_ORDER_THRESHOLDS: Array<{ status: OrderStatus; hours: number }> = [
  { status: 'PURCHASED', hours: 48 },
  { status: 'WAREHOUSE_RECEIVED', hours: 72 },
  { status: 'PENDING_SHIPPING_PAYMENT', hours: 24 },
];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startedAt = Date.now();
    let alertedOrders = 0;
    for (const { status, hours } of STUCK_ORDER_THRESHOLDS) {
      const orders = await prisma.order.findMany({
        where: { status, updatedAt: { lte: new Date(Date.now() - hours * 3_600_000) } },
        select: { id: true },
        take: 100,
      });
      if (orders.length === 0) continue;
      alertedOrders += orders.length;
      await sendOpsAlert('warning', 'stuck_order',
        `${orders.length} order(s) stuck in ${status} for ${hours}+ hours`,
        { status, stuckHours: hours, count: orders.length },
      );
    }

    return NextResponse.json({
      success: true,
      alertedOrders,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[Operational Cleanup]', error);
    await sendOpsAlert('critical', 'cron_failure', 'Operational cleanup failed', { job: 'cleanup' }).catch(() => {});
    return NextResponse.json({ error: 'Operational cleanup failed' }, { status: 500 });
  }
}
