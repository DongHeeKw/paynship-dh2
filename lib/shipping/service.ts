/**
 * Shipping Service — Manual tracking entry, carrier API integration planned.
 *
 * Supports: Korea Post EMS, DHL, FedEx (manual tracking entry now).
 * Future: auto-generated labels, carrier API polling for live status.
 */

import { prisma } from '@/lib/db/prisma';
import { validateOrderTransition } from '@/lib/orders/state-machine';
import { buildTrackingUrl, detectShippingCompany } from '@/lib/shopify/fulfillment';
import type { OrderStatus } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export type ShipmentCarrier = 'ems' | 'dhl' | 'fedex' | 'other';

export type ShipmentStatus =
  | 'label_created'
  | 'picked_up'
  | 'in_transit'
  | 'customs_clearance'
  | 'delivered';

export interface ShipmentEvent {
  timestamp: Date;
  status: string;
  location?: string;
  description: string;
}

export interface ShipmentRecord {
  orderId: string;
  carrier: ShipmentCarrier;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  estimatedDelivery?: Date;
  status: ShipmentStatus;
  events: ShipmentEvent[];
}

// Stored in Order.warehouseNotes as a JSON blob keyed by "__shipment"
// This avoids a new table while keeping data close to the order.
type ShipmentMeta = {
  carrier: ShipmentCarrier;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  estimatedDelivery?: string; // ISO string
  status: ShipmentStatus;
  events: Array<{
    timestamp: string; // ISO string
    status: string;
    location?: string;
    description: string;
  }>;
};

// Carrier label used when calling Shopify fulfillment APIs
const CARRIER_COMPANY_MAP: Record<ShipmentCarrier, string> = {
  ems: 'Korea Post',
  dhl: 'DHL',
  fedex: 'FedEx',
  other: 'Other',
};

// Map ShipmentStatus → OrderStatus for transition
const SHIPMENT_TO_ORDER_STATUS: Partial<Record<ShipmentStatus, OrderStatus>> = {
  picked_up: 'SHIPPING',
  in_transit: 'SHIPPING',
  customs_clearance: 'CUSTOMS_CLEARANCE',
  delivered: 'DELIVERED',
};

// ============================================================================
// Internal helpers
// ============================================================================

function readShipmentMeta(order: { warehouseNotes: string | null }): ShipmentMeta | null {
  if (!order.warehouseNotes) return null;
  try {
    const parsed = JSON.parse(order.warehouseNotes);
    if (parsed && typeof parsed === 'object' && parsed.__shipment) {
      return parsed.__shipment as ShipmentMeta;
    }
  } catch {
    // not JSON — plain text warehouse notes, no shipment meta
  }
  return null;
}

function mergeShipmentMeta(
  existingNotes: string | null,
  shipment: ShipmentMeta
): string {
  let container: Record<string, unknown> = {};
  if (existingNotes) {
    try {
      const parsed = JSON.parse(existingNotes);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        container = parsed as Record<string, unknown>;
      }
    } catch {
      // preserve plain-text notes under a key
      container = { __warehouseNotes: existingNotes };
    }
  }
  container.__shipment = shipment;
  return JSON.stringify(container);
}

function metaToRecord(orderId: string, meta: ShipmentMeta): ShipmentRecord {
  return {
    orderId,
    carrier: meta.carrier,
    trackingNumber: meta.trackingNumber,
    trackingUrl: meta.trackingUrl,
    labelUrl: meta.labelUrl,
    estimatedDelivery: meta.estimatedDelivery ? new Date(meta.estimatedDelivery) : undefined,
    status: meta.status,
    events: meta.events.map((e) => ({
      timestamp: new Date(e.timestamp),
      status: e.status,
      location: e.location,
      description: e.description,
    })),
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a shipment record for an order.
 * Transitions the order status to SHIPPING if it was in PENDING_SHIPPING_PAYMENT.
 */
export async function createShipment(
  orderId: string,
  carrier: ShipmentCarrier,
  trackingNumber: string,
  options?: {
    estimatedDelivery?: Date;
    labelUrl?: string;
  }
): Promise<ShipmentRecord> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      trackingNumber: true,
      trackingNumberIntl: true,
      warehouseNotes: true,
    },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const company = CARRIER_COMPANY_MAP[carrier];
  const trackingUrl = buildTrackingUrl(trackingNumber, company);

  const event: ShipmentMeta['events'][number] = {
    timestamp: new Date().toISOString(),
    status: 'label_created',
    description: `Shipment created. Carrier: ${company}, tracking: ${trackingNumber}`,
  };

  const shipmentMeta: ShipmentMeta = {
    carrier,
    trackingNumber,
    trackingUrl: trackingUrl || undefined,
    labelUrl: options?.labelUrl,
    estimatedDelivery: options?.estimatedDelivery?.toISOString(),
    status: 'label_created',
    events: [event],
  };

  const newNotes = mergeShipmentMeta(order.warehouseNotes, shipmentMeta);

  // Determine next order status
  const canTransitionToShipping = validateOrderTransition({
    currentStatus: order.status,
    nextStatus: 'SHIPPING',
    trackingNumber: trackingNumber,
    trackingNumberIntl: trackingNumber,
  }).ok;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      warehouseNotes: newNotes,
      trackingNumberIntl: trackingNumber,
      shippingCarrier: company,
      shipmentStatus: shipmentMeta.status,
      ...(trackingUrl ? { trackingNumber: trackingNumber } : {}),
      ...(canTransitionToShipping ? { status: 'SHIPPING' } : {}),
      ...(options?.estimatedDelivery ? { estimatedDeliveryAt: options.estimatedDelivery } : {}),
    },
  });

  return metaToRecord(orderId, shipmentMeta);
}

/**
 * Add a status event to a shipment and optionally advance the order status.
 */
export async function updateShipmentStatus(
  orderId: string,
  status: ShipmentStatus,
  event: Omit<ShipmentEvent, 'timestamp'> & { timestamp?: Date }
): Promise<ShipmentRecord> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      trackingNumber: true,
      trackingNumberIntl: true,
      warehouseNotes: true,
    },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const existing = readShipmentMeta(order);
  if (!existing) {
    throw new Error(`No shipment record found for order: ${orderId}`);
  }

  const newEvent: ShipmentMeta['events'][number] = {
    timestamp: (event.timestamp ?? new Date()).toISOString(),
    status,
    location: event.location,
    description: event.description,
  };

  const updated: ShipmentMeta = {
    ...existing,
    status,
    events: [...existing.events, newEvent],
  };

  const newNotes = mergeShipmentMeta(order.warehouseNotes, updated);

  // Attempt order status transition
  const mappedOrderStatus = SHIPMENT_TO_ORDER_STATUS[status];
  let nextOrderStatus: OrderStatus | undefined;
  if (mappedOrderStatus) {
    const validation = validateOrderTransition({
      currentStatus: order.status,
      nextStatus: mappedOrderStatus,
      trackingNumber: order.trackingNumber,
      trackingNumberIntl: order.trackingNumberIntl,
    });
    if (validation.ok) {
      nextOrderStatus = mappedOrderStatus;
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      warehouseNotes: newNotes,
      shipmentStatus: updated.status,
      ...(nextOrderStatus ? { status: nextOrderStatus } : {}),
    },
  });

  return metaToRecord(orderId, updated);
}

/**
 * Get shipment info for an order.
 */
export async function getShipment(orderId: string): Promise<ShipmentRecord | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, warehouseNotes: true },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const meta = readShipmentMeta(order);
  if (!meta) return null;

  return metaToRecord(orderId, meta);
}

export { detectShippingCompany };
