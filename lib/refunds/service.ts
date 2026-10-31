/**
 * Refund Service — manual refund workflow.
 *
 * Currently: stores refund records in Order metadata, marks order status.
 * Future: Shopify Refund API integration for automated refunds.
 */

import { prisma } from '@/lib/db/prisma';
import { randomUUID } from 'crypto';
import { notifyCustomer } from '@/lib/notifications/service';

// ============================================================================
// Types
// ============================================================================

export type RefundReason =
  | 'customer_request'
  | 'item_not_available'
  | 'item_damaged'
  | 'shipping_issue'
  | 'other';

export type RefundStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface RefundRecord {
  id: string;
  orderId: string;
  reason: RefundReason;
  amountUsd: number;
  status: RefundStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Stored inside Order.cartSnapshot metadata under key "__refund"
// using the same JSON-merge pattern as shipping service.
type RefundMeta = {
  id: string;
  reason: RefundReason;
  amountUsd: number;
  status: RefundStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// Pre-shipping statuses (full refund of phase1)
const PRE_SHIPPING_STATUSES = new Set([
  'PENDING_PAYMENT',
  'PURCHASED',
  'PURCHASE_FAILED',
  'WAREHOUSE_RECEIVED',
  'PENDING_SHIPPING_PAYMENT',
  'SHIPPING_PAYMENT_OVERDUE',
  // legacy
  'PENDING',
  'PAID',
  'PROCESSING',
]);

// ============================================================================
// Internal helpers
// ============================================================================

function readRefundMeta(cartSnapshot: unknown): RefundMeta | null {
  if (!cartSnapshot || typeof cartSnapshot !== 'object' || Array.isArray(cartSnapshot)) {
    return null;
  }
  const obj = cartSnapshot as Record<string, unknown>;
  if (obj.__refund && typeof obj.__refund === 'object') {
    return obj.__refund as RefundMeta;
  }
  return null;
}

function mergeRefundMeta(existing: unknown, refund: RefundMeta): Record<string, unknown> {
  let container: Record<string, unknown> = {};
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    container = { ...(existing as Record<string, unknown>) };
  } else if (Array.isArray(existing)) {
    // cartSnapshot is an array (list of items) — wrap it
    container = { __items: existing };
  }
  container.__refund = refund;
  return container;
}

function metaToRecord(orderId: string, meta: RefundMeta): RefundRecord {
  return {
    id: meta.id,
    orderId,
    reason: meta.reason,
    amountUsd: meta.amountUsd,
    status: meta.status,
    notes: meta.notes,
    createdAt: new Date(meta.createdAt),
    updatedAt: new Date(meta.updatedAt),
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initiate a refund for an order.
 *
 * - If order is pre-shipping: refund = phase1TotalUsd (full purchase amount).
 * - If post-shipping: caller must supply an explicit amount (partial refund).
 * - Sets order status to REFUND_PENDING.
 */
export async function initiateRefund(
  orderId: string,
  reason: RefundReason,
  options?: { amount?: number; notes?: string }
): Promise<RefundRecord> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      phase1TotalUsd: true,
      phase2TotalUsd: true,
      cartSnapshot: true,
    },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // Check if order can be refunded
  const terminalNoRefund = new Set(['COMPLETED', 'CANCELLED']);
  if (terminalNoRefund.has(order.status)) {
    throw new Error(`Cannot initiate refund for order in status: ${order.status}`);
  }

  const existingRefund = readRefundMeta(order.cartSnapshot);
  if (existingRefund && existingRefund.status !== 'rejected') {
    throw new Error(`Refund already exists for order: ${orderId} (status: ${existingRefund.status})`);
  }

  // Calculate refund amount
  let amountUsd: number;
  if (options?.amount !== undefined) {
    amountUsd = options.amount;
  } else if (PRE_SHIPPING_STATUSES.has(order.status)) {
    // Full refund of phase 1 total
    amountUsd = order.phase1TotalUsd ?? 0;
  } else {
    throw new Error(
      'Order has shipped — please supply an explicit refund amount for partial refunds'
    );
  }

  // Guard: refund amount must not exceed total order value
  const totalOrderValue = (order.phase1TotalUsd ?? 0) + (order.phase2TotalUsd ?? 0);
  if (amountUsd > totalOrderValue) {
    throw new Error(
      `Refund amount (${amountUsd}) exceeds order value (${totalOrderValue})`
    );
  }

  const now = new Date().toISOString();
  const refundMeta: RefundMeta = {
    id: randomUUID(),
    reason,
    amountUsd,
    status: 'pending',
    notes: options?.notes,
    createdAt: now,
    updatedAt: now,
  };

  const updatedSnapshot = mergeRefundMeta(order.cartSnapshot, refundMeta);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      cartSnapshot: JSON.parse(JSON.stringify(updatedSnapshot)),
      status: 'REFUND_PENDING',
      refundStatus: refundMeta.status,
      refundAmountUsd: refundMeta.amountUsd,
    },
  });

  return metaToRecord(orderId, refundMeta);
}

/**
 * Process a pending refund.
 *
 * Currently: marks as completed (manual operator action in Shopify/payment gateway).
 * Future: Shopify Refund API call.
 */
export async function processRefund(
  refundId: string,
  orderId: string
): Promise<RefundRecord> {
  // Look up the specific order directly — no linear scan needed
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, cartSnapshot: true, status: true, shopifyOrderId: true },
  });

  if (!order || order.status !== 'REFUND_PENDING') {
    throw new Error(`Order not found or not in REFUND_PENDING state: ${orderId}`);
  }

  const meta = readRefundMeta(order.cartSnapshot);
  if (!meta || meta.id !== refundId) {
    throw new Error(`Refund ${refundId} does not belong to order ${orderId}`);
  }

  const targetOrder = order;
  const targetMeta = meta;

  const updated: RefundMeta = {
    ...targetMeta,
    status: 'completed',
    updatedAt: new Date().toISOString(),
  };

  // Attempt Shopify refund API call (best-effort; local state is always updated)
  let shopifyRefundFailed = false;
  const shopifyOrderId = targetOrder.shopifyOrderId ?? null;
  if (shopifyOrderId) {
    try {
      const { isShopifyEnabled } = await import('@/lib/shopify/config');
      const { executeGraphQL, buildShopifyGid } = await import('@/lib/shopify/client');

      if (await isShopifyEnabled()) {
        // Fetch the first transaction ID for this order
        const orderGid = buildShopifyGid('Order', shopifyOrderId);
        const txResult = await executeGraphQL<{
          order: { transactions: Array<{ id: string; amountSet: { shopMoney: { amount: string } } }> };
        }>(
          `query GetOrderTransactions($id: ID!) {
            order(id: $id) {
              transactions(first: 1) {
                id
                amountSet { shopMoney { amount } }
              }
            }
          }`,
          { id: orderGid }
        );

        const transaction = txResult.order?.transactions?.[0];
        if (transaction) {
          const REFUND_CREATE_MUTATION = `
            mutation refundCreate($input: RefundInput!) {
              refundCreate(input: $input) {
                refund { id }
                userErrors { field message }
              }
            }
          `;
          // Use the stored refund amount (partial refund support), capped at the transaction amount
          const transactionAmount = parseFloat(transaction.amountSet.shopMoney.amount);
          const refundAmount = Math.min(targetMeta.amountUsd, transactionAmount).toFixed(2);
          await executeGraphQL<unknown>(REFUND_CREATE_MUTATION, {
            input: {
              orderId: orderGid,
              transactions: [
                {
                  transactionId: transaction.id,
                  amount: refundAmount,
                  kind: 'REFUND',
                },
              ],
              note: `Processed by PayNShip refund service (refundId: ${refundId})`,
            },
          });
          console.log(`[Refund] Shopify refund created for order ${shopifyOrderId}`);
        } else {
          console.warn(`[Refund] No transactions found for Shopify order ${shopifyOrderId} — skipping API refund`);
        }
      }
    } catch (err) {
      shopifyRefundFailed = true;
      console.error(`[Refund] Shopify refund API failed for order ${targetOrder.id}:`, err);
    }
  }

  const finalMeta: RefundMeta = {
    ...updated,
    ...(shopifyRefundFailed ? { shopifyRefundFailed: true } : {}),
  } as RefundMeta & { shopifyRefundFailed?: boolean };

  const updatedSnapshot = mergeRefundMeta(targetOrder.cartSnapshot, shopifyRefundFailed ? finalMeta : updated);

  await prisma.order.update({
    where: { id: targetOrder.id },
    data: {
      cartSnapshot: JSON.parse(JSON.stringify(updatedSnapshot)),
      status: 'CANCELLED', // order closed after refund
      refundStatus: updated.status,
      refundAmountUsd: updated.amountUsd,
    },
  });

  // Notify customer of completed refund (fire-and-forget)
  if (targetOrder.userId && targetOrder.userId !== 'anonymous') {
    notifyCustomer({
      userId: targetOrder.userId,
      type: 'REFUND_COMPLETED',
      data: { orderId: targetOrder.id, amountUsd: updated.amountUsd },
    }).catch(() => {});
  }

  return metaToRecord(targetOrder.id, updated);
}

/**
 * Get refund status for an order.
 */
export async function getRefundStatus(orderId: string): Promise<RefundRecord | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, cartSnapshot: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const meta = readRefundMeta(order.cartSnapshot);
  if (!meta) return null;

  return metaToRecord(orderId, meta);
}
