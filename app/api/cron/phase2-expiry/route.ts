import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { notifyCustomer } from '@/lib/notifications/service';
import { sendOpsAlert } from '@/lib/ops/alerting';

export const runtime = 'nodejs';

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret) {
    return false; // Default deny when CRON_SECRET is not set
  }

  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();

  // Find affected orders first so we can send per-order notifications
  const affectedOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING_SHIPPING_PAYMENT',
      phase2DueAt: { lt: now },
    },
    select: { id: true, userId: true },
  });

  // Send notifications (fire-and-forget)
  for (const order of affectedOrders) {
    if (order.userId && order.userId !== 'anonymous') {
      notifyCustomer({
        userId: order.userId,
        type: 'PHASE2_PAYMENT_OVERDUE',
        data: { orderId: order.id },
      }).catch(() => {});
    }
  }

  // Transition all affected orders to SHIPPING_PAYMENT_OVERDUE
  const result = await prisma.order.updateMany({
    where: {
      status: 'PENDING_SHIPPING_PAYMENT',
      phase2DueAt: { lt: now },
    },
    data: {
      status: 'SHIPPING_PAYMENT_OVERDUE',
    },
  });

  const transitioned = result.count;
  console.log(`[phase2-expiry] Transitioned ${transitioned} order(s) to SHIPPING_PAYMENT_OVERDUE`);

  // Auto-cancel orders overdue for 7+ days
  const autoCancelCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stalledOrders = await prisma.order.findMany({
    where: {
      status: 'SHIPPING_PAYMENT_OVERDUE',
      updatedAt: { lte: autoCancelCutoff },
    },
    select: { id: true, userId: true },
  });

  let autoCancelled = 0;
  if (stalledOrders.length > 0) {
    // Compare-and-set: only cancel orders still in SHIPPING_PAYMENT_OVERDUE
    // (prevents race where a payment webhook moves the order out between read and write)
    const cancelResult = await prisma.order.updateMany({
      where: {
        id: { in: stalledOrders.map(o => o.id) },
        status: 'SHIPPING_PAYMENT_OVERDUE',
      },
      data: { status: 'CANCELLED' },
    });
    autoCancelled = cancelResult.count;
    console.log(`[phase2-expiry] Auto-cancelled ${autoCancelled} stalled order(s)`);

    if (autoCancelled > 0) {
      // Re-fetch to get only orders that were actually cancelled (avoids false notifications)
      const cancelledOrders = await prisma.order.findMany({
        where: {
          id: { in: stalledOrders.map(o => o.id) },
          status: 'CANCELLED',
        },
        select: { id: true, userId: true },
      });

      for (const order of cancelledOrders) {
        if (order.userId && order.userId !== 'anonymous') {
          notifyCustomer({
            userId: order.userId,
            type: 'ORDER_CANCELLED',
            data: {
              orderId: order.id,
              reason: 'Your order was cancelled because the shipping payment was not completed within 7 days.',
            },
          }).catch(() => {});
        }
      }

      // Ops alert for bulk auto-cancellation
      sendOpsAlert('warning', 'phase2_overdue', `Auto-cancelled ${autoCancelled} order(s) after 7-day overdue window`, {
        autoCancelledCount: autoCancelled,
        orderIds: cancelledOrders.map(o => o.id).join(', '),
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    success: true,
    transitioned,
    autoCancelled,
    durationMs: Date.now() - startedAt,
    timestamp: now.toISOString(),
  });
}
