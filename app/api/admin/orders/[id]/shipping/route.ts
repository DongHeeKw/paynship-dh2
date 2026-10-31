/**
 * Admin Shipping API
 *
 * POST   /api/admin/orders/:id/shipping  — create shipment (manual tracking entry)
 * PATCH  /api/admin/orders/:id/shipping  — update shipment status
 * GET    /api/admin/orders/:id/shipping  — get shipment info
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi, handleApiError } from '@/lib/api/auth-middleware';
import {
  createShipment,
  updateShipmentStatus,
  getShipment,
  type ShipmentCarrier,
  type ShipmentStatus,
} from '@/lib/shipping/service';
import { isShopifyEnabled } from '@/lib/shopify';
import { createFulfillment, updateFulfillmentTracking } from '@/lib/shopify/fulfillment';
import { prisma } from '@/lib/db/prisma';

const createShipmentSchema = z.object({
  carrier: z.enum(['ems', 'dhl', 'fedex', 'other']),
  trackingNumber: z.string().min(1).max(120),
  estimatedDelivery: z.string().datetime().optional(),
  labelUrl: z.string().url().optional(),
  notifyCustomer: z.boolean().optional(),
});

const updateShipmentSchema = z.object({
  status: z.enum(['label_created', 'picked_up', 'in_transit', 'customs_clearance', 'delivered']),
  location: z.string().optional(),
  description: z.string().min(1),
  timestamp: z.string().datetime().optional(),
});

const CARRIER_COMPANY_MAP: Record<ShipmentCarrier, string> = {
  ems: 'Korea Post',
  dhl: 'DHL',
  fedex: 'FedEx',
  other: 'Other',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const { id } = await params;
    const shipment = await getShipment(id);

    if (!shipment) {
      return NextResponse.json({ error: 'No shipment record found for this order' }, { status: 404 });
    }

    return NextResponse.json({ shipment });
  } catch (error) {
    return handleApiError(error, 'Admin Shipping GET');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id } = await params;

    const body = await request.json();
    const parsed = createShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { carrier, trackingNumber, estimatedDelivery, labelUrl, notifyCustomer } = parsed.data;

    const shipment = await createShipment(id, carrier as ShipmentCarrier, trackingNumber, {
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : undefined,
      labelUrl,
    });

    // Attempt Shopify fulfillment sync synchronously so failures are visible to the caller
    let fulfillmentSyncStatus: 'skipped' | 'success' | 'failed' = 'skipped';
    let fulfillmentSyncError: string | undefined;

    try {
      const synced = await syncShopifyFulfillment(
        id,
        trackingNumber,
        CARRIER_COMPANY_MAP[carrier as ShipmentCarrier],
        notifyCustomer ?? true
      );
      fulfillmentSyncStatus = synced ? 'success' : 'skipped';
    } catch (err) {
      fulfillmentSyncStatus = 'failed';
      const errorMessage = err instanceof Error ? err.message : String(err);
      fulfillmentSyncError = errorMessage;

      console.error(`[Admin Shipping] Shopify fulfillment sync failed for order ${id}:`, err);

      // Persist failure flag in warehouseNotes so operators can retry
      try {
        const orderRecord = await prisma.order.findUnique({
          where: { id },
          select: { warehouseNotes: true },
        });
        let existingNotes: Record<string, unknown> = {};
        if (orderRecord?.warehouseNotes) {
          try {
            existingNotes = JSON.parse(orderRecord.warehouseNotes) as Record<string, unknown>;
          } catch {
            existingNotes = {};
          }
        }
        await prisma.order.update({
          where: { id },
          data: {
            warehouseNotes: JSON.stringify({
              ...existingNotes,
              __fulfillmentSyncFailed: true,
              __fulfillmentSyncError: errorMessage,
              __fulfillmentSyncFailedAt: new Date().toISOString(),
            }),
          },
        });
      } catch (noteErr) {
        console.error(`[Admin Shipping] Failed to persist sync failure flag for order ${id}:`, noteErr);
      }
    }

    return NextResponse.json(
      {
        shipment,
        fulfillmentSync: {
          status: fulfillmentSyncStatus,
          ...(fulfillmentSyncError !== undefined ? { error: fulfillmentSyncError } : {}),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, 'Admin Shipping POST');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id } = await params;

    const body = await request.json();
    const parsed = updateShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, location, description, timestamp } = parsed.data;

    const shipment = await updateShipmentStatus(id, status as ShipmentStatus, {
      status,
      location,
      description,
      timestamp: timestamp ? new Date(timestamp) : undefined,
    });

    // Push tracking update to Shopify (fire-and-forget with error logging)
    syncShopifyTrackingUpdate(id, shipment.trackingNumber, CARRIER_COMPANY_MAP[shipment.carrier]).catch(
      (err) => console.error(`[Admin Shipping] Failed to push tracking update to Shopify for order ${id}:`, err)
    );

    return NextResponse.json({ shipment });
  } catch (error) {
    return handleApiError(error, 'Admin Shipping PATCH');
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

async function syncShopifyTrackingUpdate(
  orderId: string,
  trackingNumber: string,
  company: string
): Promise<void> {
  if (!(await isShopifyEnabled())) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shopifyFulfillmentId: true },
  });

  if (!order?.shopifyFulfillmentId) return;

  await updateFulfillmentTracking(
    order.shopifyFulfillmentId,
    { number: trackingNumber, company },
    true
  );
}

async function syncShopifyFulfillment(
  orderId: string,
  trackingNumber: string,
  company: string,
  notifyCustomer: boolean
): Promise<boolean> {
  if (!(await isShopifyEnabled())) return false;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shopifyOrderId: true, shopifyFulfillmentId: true },
  });

  if (!order?.shopifyOrderId || order.shopifyFulfillmentId) return false;

  await createFulfillment(
    order.shopifyOrderId,
    { number: trackingNumber, company },
    notifyCustomer
  );

  return true;
}
