/**
 * Shopify Type Definitions
 *
 * TypeScript interfaces for Shopify Admin GraphQL API.
 *
 * @module lib/shopify/types
 */

// ============================================================================
// GraphQL Response Types
// ============================================================================

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: {
    cost: QueryCost;
  };
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: {
    code: string;
    [key: string]: unknown;
  };
}

export interface QueryCost {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: {
    maximumAvailable: number;
    currentlyAvailable: number;
    restoreRate: number;
  };
}

export interface UserError {
  field: string[];
  message: string;
}

// ============================================================================
// Product Types
// ============================================================================

export interface ShopifyProductInput {
  title: string;
  descriptionHtml?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  variants: ShopifyVariantInput[];
  media?: ShopifyMediaInput[];
  metafields?: ShopifyMetafieldInput[];
}

export interface ShopifyVariantInput {
  price: string;
  compareAtPrice?: string;
  sku?: string;
  weight?: number;
  weightUnit?: 'KILOGRAMS' | 'GRAMS' | 'POUNDS' | 'OUNCES';
  inventoryPolicy?: 'CONTINUE' | 'DENY';
  options?: string[];
}

export interface ShopifyMediaInput {
  originalSource: string;  // Image URL
  alt?: string;
  mediaContentType?: 'IMAGE' | 'VIDEO' | 'EXTERNAL_VIDEO' | 'MODEL_3D';
}

export interface ShopifyMetafieldInput {
  namespace: string;
  key: string;
  value: string;
  type: MetafieldType;
}

export type MetafieldType =
  | 'single_line_text_field'
  | 'multi_line_text_field'
  | 'url'
  | 'number_decimal'
  | 'number_integer'
  | 'json'
  | 'boolean'
  | 'date'
  | 'date_time';

export interface ShopifyProduct {
  id: string;           // GID format: gid://shopify/Product/123
  title: string;
  handle: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  variants: {
    edges: Array<{
      node: ShopifyVariant;
    }>;
  };
}

export interface ShopifyVariant {
  id: string;           // GID format: gid://shopify/ProductVariant/123
  price: string;
  sku?: string;
  weight?: number;
  weightUnit?: string;
}

// ============================================================================
// Draft Order Types
// ============================================================================

export interface DraftOrderInput {
  lineItems?: DraftOrderLineItemInput[];
  customLineItems?: CustomLineItemInput[];
  shippingLine?: ShippingLineInput;
  shippingAddress: MailingAddressInput;
  billingAddress?: MailingAddressInput;
  email: string;
  phone?: string;
  note?: string;
  noteAttributes?: NoteAttribute[];
  tags?: string[];
  taxExempt?: boolean;
}

export interface DraftOrderLineItemInput {
  variantId: string;    // GID format
  quantity: number;
}

export interface CustomLineItemInput {
  title: string;
  price: string;        // Decimal string (e.g., "25.00")
  quantity: number;
  taxable: boolean;
  requiresShipping?: boolean;
}

export interface ShippingLineInput {
  title: string;
  price: string;        // Decimal string
}

export interface MailingAddressInput {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  provinceCode?: string;
  country: string;
  countryCode?: string;
  zip: string;
  phone?: string;
  company?: string;
}

export interface NoteAttribute {
  name: string;
  value: string;
}

export interface DraftOrder {
  id: string;           // GID format
  invoiceUrl: string;   // Checkout URL for customer
  status: 'OPEN' | 'INVOICE_SENT' | 'COMPLETED';
  totalPrice: string;
  subtotalPrice: string;
  totalTax: string;
  completedAt?: string;
  order?: {
    id: string;
  };
}

// ============================================================================
// Fulfillment Types
// ============================================================================

export interface FulfillmentInput {
  lineItemsByFulfillmentOrder: FulfillmentOrderLineItems[];
  trackingInfo?: TrackingInfo;
  notifyCustomer?: boolean;
}

export interface FulfillmentOrderLineItems {
  fulfillmentOrderId: string;  // GID format
  fulfillmentOrderLineItems?: {
    id: string;
    quantity: number;
  }[];
}

export interface TrackingInfo {
  number: string;
  url?: string;
  company?: string;
}

export interface Fulfillment {
  id: string;           // GID format
  status: 'PENDING' | 'OPEN' | 'SUCCESS' | 'CANCELLED' | 'FAILURE';
  trackingInfo: TrackingInfo[];
}

export interface FulfillmentOrder {
  id: string;           // GID format
  status: 'OPEN' | 'IN_PROGRESS' | 'CANCELLED' | 'ON_HOLD' | 'SCHEDULED' | 'CLOSED';
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        totalQuantity: number;
        remainingQuantity: number;
      };
    }>;
  };
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface ShopifyWebhookShippingAddress {
  first_name: string | null;
  last_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
  phone: string | null;
  name: string | null;
  country_code: string | null;
}

export interface ShopifyOrderWebhookPayload {
  id: number;
  admin_graphql_api_id: string;
  email: string;
  total_price: string;
  financial_status: 'pending' | 'paid' | 'refunded' | 'voided' | 'partially_refunded';
  fulfillment_status: 'fulfilled' | 'partial' | null;
  note: string | null;
  note_attributes: NoteAttribute[];
  shipping_address: ShopifyWebhookShippingAddress | null;
  created_at: string;
  updated_at: string;
}

export interface ShopifyFulfillmentWebhookPayload {
  id: number;
  order_id: number;
  status: 'pending' | 'open' | 'success' | 'cancelled' | 'failure';
  tracking_number: string | null;
  tracking_url: string | null;
  tracking_company: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class ShopifyAPIError extends Error {
  constructor(
    message: string,
    public userErrors: UserError[] = [],
    public statusCode?: number,
    public graphqlErrors?: GraphQLError[]
  ) {
    super(message);
    this.name = 'ShopifyAPIError';
  }
}

export class ShopifyRateLimitError extends Error {
  constructor(
    public availableIn: number,
    public currentlyAvailable: number
  ) {
    super(`Rate limit exceeded. Available in ${availableIn}ms`);
    this.name = 'ShopifyRateLimitError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type ShopifyGID = string;  // e.g., "gid://shopify/Product/123"

export interface SyncResult {
  shopifyProductId: string;
  shopifyVariantId: string;
  isNew: boolean;
}

export interface CheckoutResult {
  draftOrderId: string;
  invoiceUrl: string;
  totalPrice: string;
}

export interface FulfillmentResult {
  fulfillmentId: string;
  status: string;
}
