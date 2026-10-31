/**
 * Shopify Fulfillment Module
 *
 * Shipping fulfillment, tracking updates, and delivery management.
 *
 * @module lib/shopify/fulfillment
 */

import { executeMutation, executeGraphQL, extractShopifyId, buildShopifyGid } from './client';
import type {
  FulfillmentInput,
  FulfillmentOrder,
  Fulfillment,
  TrackingInfo,
  FulfillmentResult,
} from './types';
import { prisma } from '@/lib/db/prisma';

// ============================================================================
// GraphQL Queries & Mutations
// ============================================================================

const GET_FULFILLMENT_ORDERS_QUERY = `
  query GetFulfillmentOrders($orderId: ID!) {
    order(id: $orderId) {
      id
      fulfillmentOrders(first: 5) {
        edges {
          node {
            id
            status
            lineItems(first: 20) {
              edges {
                node {
                  id
                  totalQuantity
                  remainingQuantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

const FULFILLMENT_CREATE_MUTATION = `
  mutation FulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
        trackingInfo {
          number
          url
          company
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const FULFILLMENT_TRACKING_UPDATE_MUTATION = `
  mutation FulfillmentTrackingInfoUpdate(
    $fulfillmentId: ID!,
    $trackingInfoInput: FulfillmentTrackingInput!,
    $notifyCustomer: Boolean
  ) {
    fulfillmentTrackingInfoUpdate(
      fulfillmentId: $fulfillmentId
      trackingInfoInput: $trackingInfoInput
      notifyCustomer: $notifyCustomer
    ) {
      fulfillment {
        id
        trackingInfo {
          number
          url
          company
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// ============================================================================
// Types
// ============================================================================

interface FulfillmentCreateResponse {
  fulfillmentCreate: {
    fulfillment: Fulfillment;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface FulfillmentOrdersResponse {
  order: {
    id: string;
    fulfillmentOrders: {
      edges: Array<{
        node: FulfillmentOrder;
      }>;
    };
  };
}

// ============================================================================
// Tracking URL Templates
// ============================================================================

const TRACKING_URL_TEMPLATES: Record<string, string> = {
  'Korea Post': 'https://trace.epost.go.kr/trace.RetrieveEmsRikg49I.comm?POST_CODE={number}',
  'EMS': 'https://trace.epost.go.kr/trace.RetrieveEmsRikg49I.comm?POST_CODE={number}',
  'DHL': 'https://www.dhl.com/en/express/tracking.html?AWB={number}',
  'FedEx': 'https://www.fedex.com/fedextrack/?trknbr={number}',
  'UPS': 'https://www.ups.com/track?tracknum={number}',
  'SF Express': 'https://www.sf-express.com/en/dynamic_function/waybill/#search/bill-number/{number}',
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get FulfillmentOrders for an Order
 *
 * Note: Shopify requires FulfillmentOrder ID (not Order ID) for fulfillment operations
 */
export async function getFulfillmentOrders(shopifyOrderId: string): Promise<FulfillmentOrder[]> {
  const gid = buildShopifyGid('Order', shopifyOrderId);

  const result = await executeGraphQL<FulfillmentOrdersResponse>(
    GET_FULFILLMENT_ORDERS_QUERY,
    { orderId: gid }
  );

  return result.order.fulfillmentOrders.edges.map(e => e.node);
}

/**
 * Create a Fulfillment for an Order
 *
 * 1. Get FulfillmentOrders from Order
 * 2. Find the OPEN fulfillment order
 * 3. Create fulfillment with tracking info
 */
export async function createFulfillment(
  shopifyOrderId: string,
  trackingInfo: TrackingInfo,
  notifyCustomer: boolean = true
): Promise<FulfillmentResult> {
  // 1. Get FulfillmentOrders
  const fulfillmentOrders = await getFulfillmentOrders(shopifyOrderId);

  // 2. Find OPEN order
  const openOrder = fulfillmentOrders.find(fo => fo.status === 'OPEN');
  if (!openOrder) {
    throw new Error(`No open fulfillment order found for order ${shopifyOrderId}`);
  }

  // 3. Build tracking URL if not provided
  const trackingUrl = trackingInfo.url || buildTrackingUrl(trackingInfo.number, trackingInfo.company || '');

  // 4. Create fulfillment
  const input: FulfillmentInput = {
    lineItemsByFulfillmentOrder: [{
      fulfillmentOrderId: openOrder.id,
      // Omit lineItems to fulfill all items
    }],
    trackingInfo: {
      number: trackingInfo.number,
      url: trackingUrl,
      company: trackingInfo.company,
    },
    notifyCustomer,
  };

  const result = await executeMutation<FulfillmentCreateResponse>(
    FULFILLMENT_CREATE_MUTATION,
    { fulfillment: input }
  );

  const fulfillment = result.fulfillmentCreate.fulfillment;

  return {
    fulfillmentId: extractShopifyId(fulfillment.id),
    status: fulfillment.status,
  };
}

/**
 * Update tracking information for an existing Fulfillment
 */
export async function updateFulfillmentTracking(
  fulfillmentId: string,
  trackingInfo: TrackingInfo,
  notifyCustomer: boolean = true
): Promise<void> {
  const gid = buildShopifyGid('Fulfillment', fulfillmentId);

  const trackingUrl = trackingInfo.url || buildTrackingUrl(trackingInfo.number, trackingInfo.company || '');

  await executeMutation(FULFILLMENT_TRACKING_UPDATE_MUTATION, {
    fulfillmentId: gid,
    trackingInfoInput: {
      number: trackingInfo.number,
      url: trackingUrl,
      company: trackingInfo.company,
    },
    notifyCustomer,
  });
}

// ============================================================================
// Order Fulfillment Integration
// ============================================================================

interface FulfillOrderOptions {
  trackingNumber: string;
  company: string;
  trackingUrl?: string;
  notifyCustomer?: boolean;
}

/**
 * Fulfill a PayNShip Order
 *
 * High-level function that:
 * 1. Creates Shopify fulfillment
 * 2. Updates PayNShip Order status
 * 3. Stores tracking information
 */
export async function fulfillOrder(
  orderId: string,
  options: FulfillOrderOptions
): Promise<FulfillmentResult> {
  // 1. Get Order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (!order.shopifyOrderId) {
    throw new Error(`Order ${orderId} is not synced with Shopify`);
  }

  // 2. Create Fulfillment in Shopify
  const result = await createFulfillment(
    order.shopifyOrderId,
    {
      number: options.trackingNumber,
      company: options.company,
      url: options.trackingUrl,
    },
    options.notifyCustomer ?? true
  );

  // 3. Update PayNShip Order
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'SHIPPED',
      trackingNumber: options.trackingNumber,
      shopifyFulfillmentId: result.fulfillmentId,
    },
  });

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build tracking URL from tracking number and company
 */
export function buildTrackingUrl(trackingNumber: string, company: string): string {
  const template = TRACKING_URL_TEMPLATES[company];

  if (template) {
    return template.replace('{number}', trackingNumber);
  }

  // Default: try to guess based on tracking number format
  if (trackingNumber.match(/^EMS\d+KR$/i) || trackingNumber.match(/^\d{13}$/)) {
    return TRACKING_URL_TEMPLATES['Korea Post'].replace('{number}', trackingNumber);
  }

  return '';
}

/**
 * Detect shipping company from tracking number format
 */
export function detectShippingCompany(trackingNumber: string): string {
  // Korea Post / EMS
  if (trackingNumber.match(/^EMS\d+KR$/i) || trackingNumber.match(/^[A-Z]{2}\d{9}KR$/i)) {
    return 'Korea Post';
  }

  // DHL
  if (trackingNumber.match(/^\d{10,11}$/)) {
    return 'DHL';
  }

  // FedEx
  if (trackingNumber.match(/^\d{12,22}$/)) {
    return 'FedEx';
  }

  // UPS
  if (trackingNumber.match(/^1Z[A-Z0-9]{16}$/i)) {
    return 'UPS';
  }

  return 'Korea Post'; // Default
}

/**
 * Get supported shipping companies
 */
export function getSupportedShippingCompanies(): string[] {
  return Object.keys(TRACKING_URL_TEMPLATES);
}
