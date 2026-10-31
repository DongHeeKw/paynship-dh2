/**
 * Admin Order Detail API
 *
 * 주문 상세 조회 (Quote에서 가격/배송 정보 가져옴)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma, type OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import {
  detectShippingCompany,
  fulfillOrder,
  isShopifyEnabled,
  updateFulfillmentTracking,
} from '@/lib/shopify';
import { isRecord } from '@/lib/utils/type-guards';
import { validateOrderTransition } from '@/lib/orders/state-machine';
import { isDemoShopifyOrderId } from '@/lib/orders/demo';
import {
  buildFieldChanges,
  extractRequestMeta,
  getRequestPathname,
  recordAdminAuditLog,
} from '@/lib/admin';
import { logApiError } from '@/lib/api/log-error';

interface CartSnapshotItem {
  name: string;
  imageUrl?: string;
  priceKrw: number;
  quantity?: number;
  selectedOptions?: Record<string, string>;
  sourceUrl?: string;
}

const orderPatchSchema = z.object({
  status: z.enum([
    'PENDING_PAYMENT',
    'PURCHASED',
    'PURCHASE_FAILED',
    'WAREHOUSE_RECEIVED',
    'PENDING_SHIPPING_PAYMENT',
    'SHIPPING_PAYMENT_OVERDUE',
    'SHIPPING',
    'CUSTOMS_CLEARANCE',
    'DELIVERING',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED',
    'REFUND_PENDING',
    'PENDING',
  ]).optional(),
  trackingNumber: z.string().max(120).nullable().optional(),
  forceLocalOnly: z.boolean().optional(),
  notifyCustomer: z.boolean().optional(),
}).refine(
  (value) => value.status !== undefined || value.trackingNumber !== undefined,
  { message: 'status 또는 trackingNumber 중 하나는 필수입니다.' }
);

interface ShopifySyncResult {
  attempted: boolean;
  synced: boolean;
  mode: 'create_fulfillment' | 'update_tracking' | null;
  skippedReason?: 'shopify_disabled' | 'tracking_required' | 'force_local_only' | 'non_shopify_order';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        quote: {
          select: {
            id: true,
            userId: true,
            productName: true,
            productSnapshot: true,
            cartSnapshot: true,
            destinationCountry: true,
            destinationAddress: true,
            productPriceUsd: true,
            serviceFee: true,
            domesticShippingUsd: true,
            internationalShipping: true,
            customsDuty: true,
            vat: true,
            totalUsd: true,
            exchangeRate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Build items from cartSnapshot or productSnapshot
    let items = extractCartSnapshotItems(order.quote?.cartSnapshot);
    if (items.length === 0 && order.quote?.productSnapshot) {
      items = [order.quote.productSnapshot as unknown as CartSnapshotItem];
    }

    // Format response - derive from Quote
    const formattedOrder = {
      id: order.id,
      quoteId: order.quoteId,
      userId: order.quote?.userId ?? null,
      status: order.status,
      totalUsd: order.quote?.totalUsd ?? null,
      shippingCountry: order.quote?.destinationCountry ?? null,
      shippingAddress: order.quote?.destinationAddress ?? null,
      trackingNumber: order.trackingNumber,
      isDemo: isDemoShopifyOrderId(order.shopifyOrderId),
      shopifyOrderId: order.shopifyOrderId,
      shopifyFulfillmentId: order.shopifyFulfillmentId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // Price breakdown
      priceBreakdown: order.quote ? {
        productPriceUsd: order.quote.productPriceUsd,
        serviceFee: order.quote.serviceFee,
        domesticShippingUsd: order.quote.domesticShippingUsd,
        internationalShipping: order.quote.internationalShipping,
        customsDuty: order.quote.customsDuty,
        vat: order.quote.vat,
        exchangeRate: order.quote.exchangeRate,
      } : null,
      // Items from snapshot
      items: items.map((item, idx) => ({
        id: `item-${idx}`,
        name: item.name,
        imageUrl: item.imageUrl || null,
        priceKrw: item.priceKrw,
        quantity: item.quantity || 1,
        options: item.selectedOptions || null,
        sourceUrl: item.sourceUrl || null,
      })),
    };

    return NextResponse.json({ order: formattedOrder });
  } catch (error) {
    console.error('[Admin Order Detail Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

function extractCartSnapshotItems(snapshot: unknown): CartSnapshotItem[] {
  if (Array.isArray(snapshot)) {
    return snapshot.filter(isCartSnapshotItem);
  }

  if (isRecord(snapshot) && Array.isArray(snapshot.items)) {
    return snapshot.items.filter(isCartSnapshotItem);
  }

  return [];
}

function isCartSnapshotItem(value: unknown): value is CartSnapshotItem {
  return isRecord(value) && typeof value.name === 'string' && typeof value.priceKrw === 'number';
}

// Update order status and tracking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id } = await params;
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        trackingNumber: true,
        shopifyOrderId: true,
        shopifyFulfillmentId: true,
      },
    });

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const requestBody = await request.json();
    const parsed = orderPatchSchema.safeParse(requestBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid payload',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { status, trackingNumber, forceLocalOnly, notifyCustomer } = parsed.data;
    const trackingProvided = trackingNumber !== undefined;
    const normalizedTracking = trackingProvided
      ? normalizeTrackingNumber(trackingNumber)
      : currentOrder.trackingNumber;
    const nextStatus: OrderStatus = status ?? currentOrder.status;

    if (status !== undefined) {
      const transitionValidation = validateOrderTransition({
        currentStatus: currentOrder.status,
        nextStatus,
        trackingNumber: normalizedTracking,
      });

      if (!transitionValidation.ok) {
        return NextResponse.json(
          {
            error: transitionValidation.message ?? 'Order status transition is invalid',
            code: transitionValidation.code ?? 'ORDER_TRANSITION_INVALID',
            allowedNextStatuses: transitionValidation.allowedNextStatuses ?? [],
          },
          { status: 409 }
        );
      }
    } else if ((nextStatus === 'SHIPPING' || nextStatus === 'SHIPPED') && !normalizedTracking) {
      return NextResponse.json(
        {
          error: 'SHIPPED 상태에서는 운송장 번호가 필요합니다.',
          code: 'ORDER_TRACKING_REQUIRED',
        },
        { status: 409 }
      );
    }

    const isRealShopifyOrder = isRealShopifyOrderId(currentOrder.shopifyOrderId);
    const wantsShippingSync = nextStatus === 'SHIPPING' || nextStatus === 'SHIPPED';
    const shouldAttemptShopifySync = wantsShippingSync && isRealShopifyOrder && !forceLocalOnly;

    const shopifySync: ShopifySyncResult = {
      attempted: false,
      synced: false,
      mode: null,
    };

    let fulfilledViaShopify = false;

    if (shouldAttemptShopifySync) {
      if (!normalizedTracking) {
        shopifySync.skippedReason = 'tracking_required';
      } else if (!(await isShopifyEnabled())) {
        shopifySync.skippedReason = 'shopify_disabled';
      } else {
        shopifySync.attempted = true;
        const shippingCompany = detectShippingCompany(normalizedTracking);

        try {
          if (currentOrder.shopifyFulfillmentId) {
            await updateFulfillmentTracking(
              currentOrder.shopifyFulfillmentId,
              {
                number: normalizedTracking,
                company: shippingCompany,
              },
              notifyCustomer ?? true
            );
            shopifySync.synced = true;
            shopifySync.mode = 'update_tracking';
          } else {
            await fulfillOrder(currentOrder.id, {
              trackingNumber: normalizedTracking,
              company: shippingCompany,
              notifyCustomer: notifyCustomer ?? true,
            });
            shopifySync.synced = true;
            shopifySync.mode = 'create_fulfillment';
            fulfilledViaShopify = true;
          }
        } catch (error) {
          await recordAdminAuditLog({
            adminUserId: admin.user?.id ?? null,
            adminUserEmail: admin.user?.email ?? null,
            action: 'ORDER_SHOPIFY_SYNC_FAILED',
            target: 'order',
            targetId: id,
            changes: [
              {
                field: 'shopifySyncError',
                before: null,
                after: error instanceof Error ? error.message : 'Unknown error',
              },
              {
                field: 'requestedStatus',
                before: currentOrder.status,
                after: nextStatus,
              },
              {
                field: 'trackingNumber',
                before: currentOrder.trackingNumber,
                after: normalizedTracking,
              },
            ],
            requestMeta: extractRequestMeta(request.headers, getRequestPathname(request)),
          });

          console.error('[Admin Order Update Error] Shopify sync failed', error);
          return NextResponse.json(
            {
              error: 'Shopify fulfillment sync failed',
              detail: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 502 }
          );
        }
      }
    } else if (wantsShippingSync && forceLocalOnly) {
      shopifySync.skippedReason = 'force_local_only';
    } else if (wantsShippingSync && !isRealShopifyOrder) {
      shopifySync.skippedReason = 'non_shopify_order';
    }

    const updateData: Prisma.OrderUpdateInput = {};
    if (status !== undefined) {
      updateData.status = status;
    }
    if (trackingProvided) {
      updateData.trackingNumber = normalizedTracking;
    }

    let order;
    if (fulfilledViaShopify) {
      order = await prisma.order.findUnique({ where: { id } });
    } else {
      order = await prisma.order.update({
        where: { id },
        data: updateData,
      });
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found after update' },
        { status: 500 }
      );
    }

    const orderChanges = buildFieldChanges(
      {
        status: currentOrder.status,
        trackingNumber: currentOrder.trackingNumber,
        shopifyFulfillmentId: currentOrder.shopifyFulfillmentId,
      },
      {
        status: order.status,
        trackingNumber: order.trackingNumber,
        shopifyFulfillmentId: order.shopifyFulfillmentId,
      },
      ['status', 'trackingNumber', 'shopifyFulfillmentId']
    );
    orderChanges.push({
      field: 'shopifySync',
      before: null,
      after: shopifySync,
    });

    await recordAdminAuditLog({
      adminUserId: admin.user?.id ?? null,
      adminUserEmail: admin.user?.email ?? null,
      action: 'UPDATE_ORDER',
      target: 'order',
      targetId: id,
      changes: orderChanges,
      requestMeta: extractRequestMeta(request.headers, getRequestPathname(request)),
    });

    return NextResponse.json({ order, shopifySync });
  } catch (error) {
    console.error('[Admin Order Update Error]', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

function normalizeTrackingNumber(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRealShopifyOrderId(shopifyOrderId: string | null): shopifyOrderId is string {
  if (!shopifyOrderId) return false;
  return !isDemoShopifyOrderId(shopifyOrderId);
}
