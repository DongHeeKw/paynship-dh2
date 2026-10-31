/**
 * Shopify Integration Module
 *
 * Headless Shopify integration for PayNShip proxy shopping service.
 * Provides dynamic product registration, Draft Order checkout, and fulfillment tracking.
 *
 * @module lib/shopify
 *
 * @example
 * ```typescript
 * import { syncProductToShopify, createDraftOrder, createFulfillment } from '@/lib/shopify';
 *
 * // Sync a scraped product to Shopify
 * const { shopifyProductId, shopifyVariantId } = await syncProductToShopify(product, exchangeRate);
 *
 * // Create checkout for customer
 * const { invoiceUrl } = await createDraftOrder(cart, quote, address, email);
 *
 * // Start fulfillment when shipping
 * const { fulfillmentId } = await createFulfillment(orderId, trackingInfo);
 * ```
 */

// ============================================================================
// Configuration
// ============================================================================

export {
  SHOPIFY_CONFIG,
  validateShopifyConfig,
  isShopifyEnabled,
  isShopifyConfigured,
  isShopifyAutoSyncEnabled,
  getGraphQLEndpoint,
  RATE_LIMIT_CONFIG,
} from './config';

// ============================================================================
// Client
// ============================================================================

export {
  executeGraphQL,
  executeMutation,
  extractShopifyId,
  buildShopifyGid,
  getRateLimiterState,
} from './client';

// ============================================================================
// Types
// ============================================================================

export type {
  // GraphQL
  GraphQLResponse,
  GraphQLError,
  QueryCost,
  UserError,

  // Product
  ShopifyProductInput,
  ShopifyVariantInput,
  ShopifyMediaInput,
  ShopifyMetafieldInput,
  MetafieldType,
  ShopifyProduct,
  ShopifyVariant,

  // Draft Order
  DraftOrderInput,
  DraftOrderLineItemInput,
  CustomLineItemInput,
  ShippingLineInput,
  MailingAddressInput,
  NoteAttribute,
  DraftOrder,

  // Fulfillment
  FulfillmentInput,
  FulfillmentOrderLineItems,
  TrackingInfo,
  Fulfillment,
  FulfillmentOrder,

  // Webhooks
  ShopifyOrderWebhookPayload,
  ShopifyFulfillmentWebhookPayload,

  // Utility
  ShopifyGID,
  SyncResult,
  CheckoutResult,
  FulfillmentResult,
} from './types';

export {
  ShopifyAPIError,
  ShopifyRateLimitError,
} from './types';

// ============================================================================
// Metafields
// ============================================================================

export {
  METAFIELD_NAMESPACE,
  METAFIELD_KEYS,
  buildSourceUrlQuery,
} from './metafields';

export type { MetafieldKey } from './metafields';

// ============================================================================
// Business Logic Modules
// ============================================================================

// Canonical: Product deduplication and grouping (Hybrid Architecture)
// Architecture: Option D - Hybrid (Multiple URLs → Single Shopify Product)
export {
  // Hash generation
  createCanonicalHash,
  createCanonicalHashFromProduct,
  normalizeProductName,
  // Database operations
  findByCanonicalHash,
  findCanonicalForProduct,
  createCanonical,
  linkProductToCanonical,
  // Lowest price management
  updateLowestPrice,
  getLowestPriceProduct,
  getCanonicalProducts,
  getCanonicalWithProducts,
  // Price history
  addPriceHistoryEntry,
  // Utility
  isProductLinked,
} from './canonical';

// Products: Shopify Product creation and sync (Hybrid Architecture)
// Architecture: Option D - Products are created in Shopify, linked via CanonicalProduct
export {
  syncProductToShopify,
  findBySourceUrl,
  createShopifyProduct,
} from './products';

// Orders: Draft Order with CustomLineItems (Hybrid Architecture)
// Note: Uses customLineItems for price control (Shopify doesn't support price override in lineItems)
export {
  createDraftOrder,
  createDraftOrderFromQuote,
  getDraftOrder,
  completeDraftOrder,
  isDraftOrderCompleted,
  getCheckoutUrl,
  buildMailingAddress,
} from './orders';

// Fulfillment: Shipping and tracking
export {
  createFulfillment,
  updateFulfillmentTracking,
  getFulfillmentOrders,
  fulfillOrder,
  buildTrackingUrl,
  detectShippingCompany,
  getSupportedShippingCompanies,
} from './fulfillment';
