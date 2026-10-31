/**
 * Shopify Orders Module
 *
 * Draft Order creation using CustomLineItems for price control.
 * Hybrid Architecture: Shopify Products exist but prices come from PayNShip.
 *
 * Architecture: Option D - Hybrid
 * - Shopify Products ARE registered (via CanonicalProduct)
 * - Draft Orders use customLineItems for PayNShip-calculated prices
 * - noteAttributes track canonical_product_ids and source URLs
 * - CartItem snapshots orderedSourceUrl/orderedPriceKrw at order time
 *
 * @module lib/shopify/orders
 */

import { executeMutation, executeGraphQL, extractShopifyId, buildShopifyGid } from './client';
import type {
  DraftOrderInput,
  CustomLineItemInput,
  MailingAddressInput,
  DraftOrder,
  CheckoutResult,
} from './types';
import { prisma } from '@/lib/db/prisma';
import type { Quote, Cart, CartItem, Product } from '@prisma/client';
import { isRecord } from '@/lib/utils/type-guards';

// ============================================================================
// GraphQL Mutations
// ============================================================================

const DRAFT_ORDER_CREATE_MUTATION = `
  mutation DraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
        status
        totalPrice
        subtotalPrice
        totalTax
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DRAFT_ORDER_QUERY = `
  query GetDraftOrder($id: ID!) {
    draftOrder(id: $id) {
      id
      invoiceUrl
      status
      totalPrice
      completedAt
      order {
        id
      }
    }
  }
`;

const DRAFT_ORDER_COMPLETE_MUTATION = `
  mutation DraftOrderComplete($id: ID!) {
    draftOrderComplete(id: $id) {
      draftOrder {
        id
        order {
          id
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

interface DraftOrderCreateResponse {
  draftOrderCreate: {
    draftOrder: DraftOrder;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface DraftOrderCompleteResponse {
  draftOrderComplete: {
    draftOrder: {
      id: string;
      order: { id: string };
    };
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface CartWithItems extends Cart {
  items: (CartItem & { product: Product | null })[];
}

interface QuoteSnapshotItem {
  name: string;
  sourceUrl: string | null;
  priceKrw: number;
  quantity: number;
  selectedOptions: Record<string, string> | null;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create a Draft Order using CustomLineItems ONLY
 *
 * No Shopify Products are created. All items are custom line items
 * with snapshot data from the order time.
 *
 * Structure:
 * - customLineItems: Each cart item with name + price + quantity
 * - customLineItems: Service fee, customs duty (as separate items)
 * - shippingLine: International shipping
 */
export async function createDraftOrder(
  cart: CartWithItems,
  quote: Quote,
  shippingAddress: MailingAddressInput,
  email: string
): Promise<CheckoutResult> {
  const customLineItems: CustomLineItemInput[] = [];

  // 1. Add each cart item as a customLineItem
  for (const item of cart.items) {
    // Calculate USD price for this item
    const itemPriceUsd = (item.priceKrw / quote.exchangeRate);
    const itemTotalUsd = itemPriceUsd * item.quantity;

    // Format item title with source info
    const sourceHost = extractHostname(item.sourceUrl);
    const optionsText = formatSelectedOptions(item.selectedOptions as Record<string, string> | null);
    const title = optionsText
      ? `${item.name} (${optionsText}) [${sourceHost}]`
      : `${item.name} [${sourceHost}]`;

    customLineItems.push({
      title: truncateTitle(title, 255),
      price: itemPriceUsd.toFixed(2),
      quantity: item.quantity,
      taxable: false,
      requiresShipping: true,
    });
  }

  // 2. Add fees as separate customLineItems (for transparency)
  if (quote.serviceFee > 0) {
    customLineItems.push({
      title: 'Service Fee (서비스 수수료 10%)',
      price: quote.serviceFee.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  if (quote.customsDuty > 0) {
    customLineItems.push({
      title: 'Estimated Customs Duty (예상 관세)',
      price: quote.customsDuty.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  if (quote.vat > 0) {
    customLineItems.push({
      title: 'VAT/GST',
      price: quote.vat.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  if (quote.domesticShippingUsd > 0) {
    customLineItems.push({
      title: 'Korea Domestic Shipping (국내 배송)',
      price: quote.domesticShippingUsd.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  // 3. Collect canonical product IDs and snapshot order data
  const canonicalProductIds = cart.items
    .map(item => item.product?.canonicalProductId)
    .filter((id): id is string => !!id);

  const shopifyProductIds = cart.items
    .map(item => item.product?.shopifyProductId)
    .filter((id): id is string => !!id);

  // Snapshot orderedSourceUrl and orderedPriceKrw for each CartItem
  // This creates an immutable record of which URL/price was used at order time
  await Promise.all(
    cart.items.map(item =>
      prisma.cartItem.update({
        where: { id: item.id },
        data: {
          orderedSourceUrl: item.sourceUrl,
          orderedPriceKrw: item.priceKrw,
        },
      })
    )
  );

  // 4. Build Draft Order input
  const input: DraftOrderInput = {
    // Using customLineItems for price control (Shopify doesn't support price override in lineItems)
    customLineItems,
    shippingLine: {
      title: 'International Shipping (EMS 국제 배송)',
      price: quote.internationalShipping.toFixed(2),
    },
    shippingAddress,
    email,
    note: buildOrderNote(quote, cart),
    noteAttributes: [
      { name: 'quote_id', value: quote.id },
      { name: 'destination_country', value: quote.destinationCountry },
      { name: 'exchange_rate', value: String(quote.exchangeRate) },
      { name: 'item_count', value: String(cart.items.length) },
      { name: 'source', value: 'PayNShip Korea Proxy' },
      // Hybrid Architecture: Track canonical and Shopify product IDs
      { name: 'canonical_product_ids', value: JSON.stringify(canonicalProductIds) },
      { name: 'shopify_product_ids', value: JSON.stringify(shopifyProductIds) },
    ],
    tags: ['payns-proxy', 'korea', quote.destinationCountry.toLowerCase()],
  };

  // 5. Create Draft Order in Shopify
  const result = await executeMutation<DraftOrderCreateResponse>(
    DRAFT_ORDER_CREATE_MUTATION,
    { input }
  );

  const draftOrder = result.draftOrderCreate.draftOrder;
  const draftOrderId = extractShopifyId(draftOrder.id);

  // 6. Update Quote with Shopify data
  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      shopifyDraftId: draftOrderId,
      invoiceUrl: draftOrder.invoiceUrl,
    },
  });

  console.log(`[Shopify] Draft Order created: ${draftOrderId}, invoiceUrl: ${draftOrder.invoiceUrl}`);

  return {
    draftOrderId,
    invoiceUrl: draftOrder.invoiceUrl,
    totalPrice: draftOrder.totalPrice,
  };
}

/**
 * Create a Draft Order from Quote snapshot data only.
 *
 * This path is used by the checkout orchestration API when cart rows
 * are not guaranteed to exist (e.g., single-product quote flow).
 */
export async function createDraftOrderFromQuote(
  quote: Quote,
  shippingAddress: MailingAddressInput,
  email: string
): Promise<CheckoutResult> {
  const snapshotItems = extractQuoteSnapshotItems(quote);
  const customLineItems: CustomLineItemInput[] = [];

  for (const item of snapshotItems) {
    const itemPriceUsd = item.priceKrw / quote.exchangeRate;
    const sourceHost = item.sourceUrl ? extractHostname(item.sourceUrl) : 'korea';
    const optionsText = formatSelectedOptions(item.selectedOptions);
    const title = optionsText
      ? `${item.name} (${optionsText}) [${sourceHost}]`
      : `${item.name} [${sourceHost}]`;

    customLineItems.push({
      title: truncateTitle(title, 255),
      price: itemPriceUsd.toFixed(2),
      quantity: item.quantity,
      taxable: false,
      requiresShipping: true,
    });
  }

  if (customLineItems.length === 0 && quote.productPriceUsd > 0) {
    customLineItems.push({
      title: truncateTitle(quote.productName || `Quote Item ${quote.id}`, 255),
      price: quote.productPriceUsd.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: true,
    });
  }

  if (quote.serviceFee > 0) {
    customLineItems.push({
      title: 'Service Fee (서비스 수수료 10%)',
      price: quote.serviceFee.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  if (quote.customsDuty > 0) {
    customLineItems.push({
      title: 'Estimated Customs Duty (예상 관세)',
      price: quote.customsDuty.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  if (quote.vat > 0) {
    customLineItems.push({
      title: 'VAT/GST',
      price: quote.vat.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  if (quote.domesticShippingUsd > 0) {
    customLineItems.push({
      title: 'Korea Domestic Shipping (국내 배송)',
      price: quote.domesticShippingUsd.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  const totalItemCount = snapshotItems.reduce((sum, item) => sum + item.quantity, 0);
  const input: DraftOrderInput = {
    customLineItems,
    shippingLine: {
      title: 'International Shipping (EMS 국제 배송)',
      price: quote.internationalShipping.toFixed(2),
    },
    shippingAddress,
    email,
    note: buildQuoteOrderNote(quote, snapshotItems),
    noteAttributes: [
      { name: 'quote_id', value: quote.id },
      { name: 'destination_country', value: quote.destinationCountry },
      { name: 'exchange_rate', value: String(quote.exchangeRate) },
      { name: 'item_count', value: String(totalItemCount || 1) },
      { name: 'source', value: 'PayNShip Quote Checkout' },
    ],
    tags: ['payns-proxy', 'quote-checkout', quote.destinationCountry.toLowerCase()],
  };

  const result = await executeMutation<DraftOrderCreateResponse>(
    DRAFT_ORDER_CREATE_MUTATION,
    { input }
  );

  const draftOrder = result.draftOrderCreate.draftOrder;
  const draftOrderId = extractShopifyId(draftOrder.id);

  await prisma.quote.update({
    where: { id: quote.id },
    data: {
      shopifyDraftId: draftOrderId,
      invoiceUrl: draftOrder.invoiceUrl,
    },
  });

  console.log(`[Shopify] Draft Order created from quote: ${draftOrderId}, invoiceUrl: ${draftOrder.invoiceUrl}`);

  return {
    draftOrderId,
    invoiceUrl: draftOrder.invoiceUrl,
    totalPrice: draftOrder.totalPrice,
  };
}

/**
 * Get Draft Order status
 */
export async function getDraftOrder(draftOrderId: string): Promise<DraftOrder | null> {
  const gid = buildShopifyGid('DraftOrder', draftOrderId);

  const result = await executeGraphQL<{ draftOrder: DraftOrder }>(
    DRAFT_ORDER_QUERY,
    { id: gid }
  );

  return result.draftOrder;
}

/**
 * Complete a Draft Order manually (for bank transfer / custom payment)
 */
export async function completeDraftOrder(draftOrderId: string): Promise<string> {
  const gid = buildShopifyGid('DraftOrder', draftOrderId);

  const result = await executeMutation<DraftOrderCompleteResponse>(
    DRAFT_ORDER_COMPLETE_MUTATION,
    { id: gid }
  );

  return extractShopifyId(result.draftOrderComplete.draftOrder.order.id);
}

/**
 * Check if Draft Order has been completed (paid)
 */
export async function isDraftOrderCompleted(draftOrderId: string): Promise<boolean> {
  const draftOrder = await getDraftOrder(draftOrderId);
  return draftOrder?.status === 'COMPLETED' || draftOrder?.order !== null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract hostname from URL for display
 */
function extractHostname(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').replace('.com', '');
  } catch {
    return 'korea';
  }
}

/**
 * Format selected options for display
 */
function formatSelectedOptions(options: Record<string, string> | null): string {
  if (!options || Object.keys(options).length === 0) {
    return '';
  }

  return Object.values(options).join(', ');
}

/**
 * Truncate title to max length
 */
function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) {
    return title;
  }
  return title.slice(0, maxLength - 3) + '...';
}

/**
 * Build order note with summary
 */
function buildOrderNote(quote: Quote, cart: CartWithItems): string {
  const lines = [
    'PayNShip Korea Proxy Order',
    '─'.repeat(30),
    `Quote ID: ${quote.id}`,
    `Items: ${cart.items.length}`,
    `Destination: ${quote.destinationCountry}`,
    `Exchange Rate: ₩${quote.exchangeRate}/USD`,
    '',
    'Item Sources:',
  ];

  for (const item of cart.items) {
    lines.push(`- ${item.name}: ${item.sourceUrl}`);
  }

  return lines.join('\n');
}

/**
 * Build order note for quote snapshot flow
 */
function buildQuoteOrderNote(quote: Quote, items: QuoteSnapshotItem[]): string {
  const lines = [
    'PayNShip Quote Checkout',
    '─'.repeat(30),
    `Quote ID: ${quote.id}`,
    `Items: ${items.length}`,
    `Destination: ${quote.destinationCountry}`,
    `Exchange Rate: ₩${quote.exchangeRate}/USD`,
    '',
    'Item Sources:',
  ];

  for (const item of items) {
    lines.push(`- ${item.name}: ${item.sourceUrl || 'n/a'}`);
  }

  return lines.join('\n');
}

function extractQuoteSnapshotItems(quote: Quote): QuoteSnapshotItem[] {
  const items: QuoteSnapshotItem[] = [];

  if (isRecord(quote.cartSnapshot) && Array.isArray(quote.cartSnapshot.items)) {
    for (const rawItem of quote.cartSnapshot.items) {
      if (!isRecord(rawItem)) continue;

      const name = typeof rawItem.name === 'string' ? rawItem.name : quote.productName || 'Item';
      const sourceUrl = typeof rawItem.sourceUrl === 'string' ? rawItem.sourceUrl : null;
      const priceKrw = typeof rawItem.priceKrw === 'number' ? rawItem.priceKrw : 0;
      const quantity = typeof rawItem.quantity === 'number' && rawItem.quantity > 0
        ? Math.floor(rawItem.quantity)
        : 1;
      const selectedOptions = normalizeStringMap(rawItem.selectedOptions);

      if (priceKrw <= 0) continue;
      items.push({ name, sourceUrl, priceKrw, quantity, selectedOptions });
    }
  }

  if (items.length === 0 && isRecord(quote.productSnapshot)) {
    const name = typeof quote.productSnapshot.name === 'string'
      ? quote.productSnapshot.name
      : quote.productName || 'Item';
    const sourceUrl = typeof quote.productSnapshot.sourceUrl === 'string'
      ? quote.productSnapshot.sourceUrl
      : null;
    const priceKrw = typeof quote.productSnapshot.priceKrw === 'number'
      ? quote.productSnapshot.priceKrw
      : Math.round(quote.productPriceUsd * quote.exchangeRate);
    const selectedOptions = normalizeStringMap(quote.productSnapshot.selectedOptions);

    if (priceKrw > 0) {
      items.push({
        name,
        sourceUrl,
        priceKrw,
        quantity: 1,
        selectedOptions,
      });
    }
  }

  return items;
}

function normalizeStringMap(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;

  const entries = Object.entries(value).filter(([, entryValue]) => typeof entryValue === 'string');
  if (entries.length === 0) return null;

  return Object.fromEntries(entries) as Record<string, string>;
}


/**
 * Build MailingAddressInput from Quote destination address
 */
export function buildMailingAddress(
  addressJson: Record<string, string>
): MailingAddressInput {
  return {
    firstName: addressJson.firstName || addressJson.first_name || '',
    lastName: addressJson.lastName || addressJson.last_name || '',
    address1: addressJson.address1 || addressJson.street || addressJson.address || '',
    address2: addressJson.address2 || addressJson.apartment || '',
    city: addressJson.city || '',
    province: addressJson.province || addressJson.state || '',
    provinceCode: addressJson.provinceCode || addressJson.state_code || '',
    country: addressJson.country || '',
    countryCode: addressJson.countryCode || addressJson.country_code || '',
    zip: addressJson.zip || addressJson.postal_code || addressJson.postalCode || '',
    phone: addressJson.phone || '',
    company: addressJson.company || '',
  };
}

/**
 * Create a Phase 2 Shopify Draft Order for shipping costs.
 * Called after warehouse measurement when Phase 2 payment is requested.
 */
export async function createPhase2DraftOrder(order: {
  id: string;
  userId: string;
  phase2TotalUsd: number;
  intlShippingUsd?: number | null;
  customsDutyUsd?: number | null;
  taxUsd?: number | null;
  packagingFeeUsd?: number | null;
  chargeableWeightKg?: number | null;
  destinationCountry?: string | null;
  shippingAddress?: unknown;
}): Promise<{ draftOrderId: string; invoiceUrl: string } | null> {
  const { isShopifyEnabled } = await import('./config');
  if (!(await isShopifyEnabled())) {
    return null;
  }

  const customLineItems: CustomLineItemInput[] = [];

  // International shipping
  if (order.intlShippingUsd != null && order.intlShippingUsd > 0) {
    const weightLabel = order.chargeableWeightKg != null
      ? `${order.chargeableWeightKg}kg`
      : '';
    const title = weightLabel
      ? `International Shipping (${weightLabel})`
      : 'International Shipping';
    customLineItems.push({
      title,
      price: order.intlShippingUsd.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  // Customs duty
  if (order.customsDutyUsd != null && order.customsDutyUsd > 0) {
    customLineItems.push({
      title: 'Customs Duty',
      price: order.customsDutyUsd.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  // Tax/VAT
  if (order.taxUsd != null && order.taxUsd > 0) {
    customLineItems.push({
      title: 'Tax/VAT',
      price: order.taxUsd.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  // Packaging fee
  if (order.packagingFeeUsd != null && order.packagingFeeUsd > 0) {
    customLineItems.push({
      title: 'Packaging Fee',
      price: order.packagingFeeUsd.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  // Fallback: if no line items were built, add a single total line
  if (customLineItems.length === 0) {
    customLineItems.push({
      title: 'Phase 2 Shipping & Fees',
      price: order.phase2TotalUsd.toFixed(2),
      quantity: 1,
      taxable: false,
      requiresShipping: false,
    });
  }

  // Build mailing address from shippingAddress if present
  const mailingAddress: MailingAddressInput = isRecord(order.shippingAddress)
    ? buildMailingAddress(order.shippingAddress as Record<string, string>)
    : {
        firstName: '',
        lastName: '',
        address1: '',
        city: '',
        country: order.destinationCountry || '',
        zip: '',
      };

  // Look up user email for invoice delivery
  let customerEmail = '';
  if (order.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true },
      });
      if (user?.email) {
        customerEmail = user.email;
      } else {
        console.warn(`[Shopify] createPhase2DraftOrder: No email found for user ${order.userId}, invoice will not be sent`);
      }
    } catch (err) {
      console.warn(`[Shopify] createPhase2DraftOrder: Failed to look up user email for ${order.userId}:`, err);
    }
  }

  const input: DraftOrderInput = {
    customLineItems,
    shippingAddress: mailingAddress,
    email: customerEmail,
    note: `PayNShip Phase 2 - Shipping Payment | Order: ${order.id}`,
    noteAttributes: [
      { name: 'order_id', value: order.id },
      { name: 'payment_phase', value: '2' },
    ],
    tags: ['payns-phase2', 'shipping-payment'],
  };

  const result = await executeMutation<DraftOrderCreateResponse>(
    DRAFT_ORDER_CREATE_MUTATION,
    { input }
  );

  const draftOrder = result.draftOrderCreate.draftOrder;
  const draftOrderId = extractShopifyId(draftOrder.id);

  console.log(`[Shopify] Phase 2 Draft Order created: ${draftOrderId}, invoiceUrl: ${draftOrder.invoiceUrl}`);

  return { draftOrderId, invoiceUrl: draftOrder.invoiceUrl };
}

/**
 * Get checkout URL for a quote
 */
export async function getCheckoutUrl(
  quoteId: string,
  email: string
): Promise<string | null> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
  });

  if (!quote) {
    return null;
  }

  // Return existing URL if available and Draft Order is still open
  if (quote.invoiceUrl && quote.shopifyDraftId) {
    const isCompleted = await isDraftOrderCompleted(quote.shopifyDraftId);
    if (!isCompleted) {
      return quote.invoiceUrl;
    }
  }

  return null;
}
