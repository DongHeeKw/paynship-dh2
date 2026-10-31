/**
 * PayNShip v2.1 — Orders webhook handlers
 *
 * Topics:
 *  - orders/paid → 구매대행 시작 (ProcurementTask 생성)
 *  - orders/cancelled → 구매대행 중단
 *
 * 기존 v1 handler와 별개로, v2.1 Shopify orders만 처리.
 */

import { prisma } from '@/lib/db/prisma';
import logger from '@/lib/utils/logger';

export interface ShopifyOrderPayload {
  id: number;                        // numeric Shopify order ID
  name: string;                      // "#1001"
  email: string | null;
  currency: string;
  total_price: string;
  subtotal_price: string;
  financial_status: string | null;
  fulfillment_status: string | null;
  tags: string;
  created_at: string;
  customer?: {
    id?: number;
    email?: string;
  } | null;
  line_items?: Array<{
    id: number;
    variant_id: number | null;
    product_id: number | null;
    title: string;
    quantity: number;
    price: string;
  }>;
  shipping_address?: {
    country_code?: string;
    city?: string;
    zip?: string;
  } | null;
  note_attributes?: Array<{ name: string; value: string }>;
}

/**
 * orders/paid handler.
 * ProcurementTask 생성 (status=QUEUED, step=1).
 */
export async function handleOrderPaid(payload: ShopifyOrderPayload): Promise<void> {
  const shopifyOrderIdStr = String(payload.id);

  // Idempotency: 이미 ProcurementTask 있으면 skip
  const existing = await prisma.procurementTask.findFirst({
    where: {
      metadata: {
        path: ['shopifyOrderId'],
        equals: shopifyOrderIdStr,
      },
    },
    select: { id: true },
  });

  if (existing) {
    logger.info('WebhookV2Orders', `ProcurementTask already exists for order ${shopifyOrderIdStr}`);
    return;
  }

  const task = await prisma.procurementTask.create({
    data: {
      status: 'QUEUED',
      metadata: {
        shopifyOrderId: shopifyOrderIdStr,
        shopifyOrderName: payload.name,
        customerEmail: payload.customer?.email ?? payload.email ?? null,
        shippingCountry: payload.shipping_address?.country_code ?? null,
        totalPrice: payload.total_price,
        currencyCode: payload.currency,
        lineItemCount: payload.line_items?.length ?? 0,
        source: 'shopify-v2-webhook',
        receivedAt: new Date().toISOString(),
        tags: payload.tags,
      },
    },
    select: { id: true },
  });

  logger.info(
    'WebhookV2Orders',
    `Order paid — created ProcurementTask ${task.id} for Shopify order ${payload.name} (${shopifyOrderIdStr}, ${payload.total_price} ${payload.currency})`,
  );
}

/**
 * orders/cancelled handler.
 */
export async function handleOrderCancelled(payload: ShopifyOrderPayload): Promise<void> {
  const shopifyOrderIdStr = String(payload.id);

  // Find ProcurementTask by metadata
  const tasks = await prisma.procurementTask.findMany({
    where: {
      metadata: {
        path: ['shopifyOrderId'],
        equals: shopifyOrderIdStr,
      },
      status: { in: ['QUEUED', 'RESEARCHING', 'READY_TO_BUY', 'ORDER_RECEIVED', 'ORDER_CONFIRMED', 'PROCUREMENT_IN_PROGRESS'] },
    },
    select: { id: true },
  });

  if (tasks.length === 0) {
    logger.warn('WebhookV2Orders', `No active task to cancel for order ${shopifyOrderIdStr}`);
    return;
  }

  await prisma.procurementTask.updateMany({
    where: { id: { in: tasks.map(t => t.id) } },
    data: { status: 'CANCELLED' },
  });

  logger.info(
    'WebhookV2Orders',
    `Order cancelled — updated ${tasks.length} task(s) to CANCELLED for order ${shopifyOrderIdStr}`,
  );
}
