/**
 * Admin Phase 2 Payment Request API
 *
 * POST /api/admin/orders/:id/request-phase2
 * Admin sends Phase 2 payment request to customer.
 * Sets due date (3 days) and transitions order to PENDING_SHIPPING_PAYMENT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi, handleApiError } from '@/lib/api/auth-middleware';
import { createPhase2DraftOrder } from '@/lib/shopify/orders';
import { notifyCustomer } from '@/lib/notifications/service';

const PHASE2_DUE_DAYS = 3;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        phase2TotalUsd: true,
        intlShippingUsd: true,
        customsDutyUsd: true,
        taxUsd: true,
        packagingFeeUsd: true,
        chargeableWeightKg: true,
        destinationCountry: true,
        shippingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Phase 2 Hybrid: if chargeable weight is below threshold, Phase 2 is not applicable.
    const LIGHTWEIGHT_THRESHOLD_KG = 0.5;
    if (
      order.chargeableWeightKg !== null &&
      order.chargeableWeightKg < LIGHTWEIGHT_THRESHOLD_KG
    ) {
      return NextResponse.json(
        {
          error: 'Phase 2 payment is not applicable for lightweight items (< 0.5kg). Shipping was already included in Phase 1 with a conservative estimate.',
          code: 'PHASE2_NOT_APPLICABLE',
          chargeableWeightKg: order.chargeableWeightKg,
        },
        { status: 422 }
      );
    }

    if (order.status !== 'WAREHOUSE_RECEIVED') {
      return NextResponse.json(
        {
          error: 'Order must be in WAREHOUSE_RECEIVED status to request Phase 2 payment',
          code: 'ORDER_TRANSITION_INVALID',
          currentStatus: order.status,
        },
        { status: 409 }
      );
    }

    if (order.phase2TotalUsd == null) {
      return NextResponse.json(
        {
          error: 'Phase 2 total has not been calculated yet. Complete warehouse receipt first.',
          code: 'PHASE2_TOTAL_MISSING',
        },
        { status: 422 }
      );
    }

    const now = new Date();
    const dueAt = new Date(now.getTime() + PHASE2_DUE_DAYS * 24 * 60 * 60 * 1000);

    // Attempt to create a Shopify Phase 2 Draft Order (non-blocking on failure)
    let shopifyResult: { draftOrderId: string; invoiceUrl: string } | null = null;
    try {
      shopifyResult = await createPhase2DraftOrder({
        id: order.id,
        userId: order.userId,
        phase2TotalUsd: order.phase2TotalUsd as number,
        intlShippingUsd: order.intlShippingUsd,
        customsDutyUsd: order.customsDutyUsd,
        taxUsd: order.taxUsd,
        packagingFeeUsd: order.packagingFeeUsd,
        chargeableWeightKg: order.chargeableWeightKg,
        destinationCountry: order.destinationCountry,
        shippingAddress: order.shippingAddress,
      });
    } catch (shopifyError) {
      console.error('[Admin Request Phase2] Shopify draft order creation failed:', shopifyError);
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        phase2RequestedAt: now,
        phase2DueAt: dueAt,
        status: 'PENDING_SHIPPING_PAYMENT',
        ...(shopifyResult ? { shopifyPhase2DraftId: shopifyResult.draftOrderId } : {}),
      },
    });

    notifyCustomer({
      userId: order.userId,
      type: 'PHASE2_PAYMENT_REQUEST',
      data: {
        amount: order.phase2TotalUsd,
        dueDate: dueAt.toISOString(),
        checkoutUrl: shopifyResult?.invoiceUrl,
        orderId: order.id,
      },
    }).catch(() => {}); // fire-and-forget

    return NextResponse.json({
      orderId: updatedOrder.id,
      phase2TotalUsd: updatedOrder.phase2TotalUsd,
      dueAt: updatedOrder.phase2DueAt,
      status: updatedOrder.status,
      ...(shopifyResult ? { invoiceUrl: shopifyResult.invoiceUrl } : {}),
    });
  } catch (error) {
    return handleApiError(error, 'Admin Request Phase2 POST');
  }
}
