/**
 * Shopify Products Module
 *
 * Product registration, synchronization, and deduplication via CanonicalProduct.
 *
 * Architecture: Option D - Hybrid
 * - Multiple PayNShip Products (different URLs) → Single Shopify Product
 * - Deduplication via canonicalHash (name + category + image)
 * - Pricing from PayNShip (customLineItems in Draft Order)
 *
 * @module lib/shopify/products
 */

import { executeMutation, executeGraphQL, extractShopifyId, buildShopifyGid } from './client';
import { METAFIELD_NAMESPACE, METAFIELD_KEYS, buildSourceUrlQuery } from './metafields';
import {
  createCanonicalHashFromProduct,
  findByCanonicalHash,
  createCanonical,
  linkProductToCanonical,
} from './canonical';
import type {
  ShopifyProductInput,
  ShopifyMetafieldInput,
  ShopifyProduct,
  ShopifyVariant,
  SyncResult,
} from './types';
import { prisma } from '@/lib/db/prisma';
import type { Product } from '@prisma/client';

// ============================================================================
// GraphQL Queries & Mutations
// ============================================================================

const FIND_BY_SOURCE_URL_QUERY = `
  query FindBySourceUrl($query: String!) {
    products(first: 1, query: $query) {
      edges {
        node {
          id
          title
          handle
          status
          variants(first: 1) {
            edges {
              node {
                id
                price
              }
            }
          }
        }
      }
    }
  }
`;

const PRODUCT_CREATE_MUTATION = `
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        status
        variants(first: 10) {
          edges {
            node {
              id
              price
              sku
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PRODUCT_VARIANT_UPDATE_MUTATION = `
  mutation ProductVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant {
        id
        price
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PUBLISHABLE_PUBLISH_MUTATION = `
  mutation PublishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
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

interface FindProductResult {
  id: string;
  title: string;
  handle: string;
  status: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        price: string;
      };
    }>;
  };
}

interface ProductCreateResponse {
  productCreate: {
    product: ShopifyProduct;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Find existing product by source URL using metafield query
 */
export async function findBySourceUrl(sourceUrl: string): Promise<FindProductResult | null> {
  const searchQuery = buildSourceUrlQuery(sourceUrl);

  const result = await executeGraphQL<{
    products: { edges: Array<{ node: FindProductResult }> };
  }>(FIND_BY_SOURCE_URL_QUERY, { query: searchQuery });

  return result.products.edges[0]?.node ?? null;
}

/**
 * Create a new product in Shopify
 */
export async function createProduct(input: ShopifyProductInput): Promise<ShopifyProduct> {
  // Transform input to match Shopify's expected format
  const shopifyInput = {
    title: input.title,
    descriptionHtml: input.descriptionHtml,
    vendor: input.vendor,
    productType: input.productType,
    tags: input.tags,
    status: input.status || 'ACTIVE',
    variants: input.variants.map(v => ({
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      sku: v.sku,
      weight: v.weight,
      weightUnit: v.weightUnit || 'KILOGRAMS',
      inventoryPolicy: v.inventoryPolicy || 'CONTINUE',
      options: v.options,
    })),
    // Media handled separately in newer API versions
    metafields: input.metafields,
  };

  const result = await executeMutation<ProductCreateResponse>(
    PRODUCT_CREATE_MUTATION,
    { input: shopifyInput }
  );

  return result.productCreate.product;
}

/**
 * Update product variant price
 */
export async function updateProductPrice(
  variantId: string,
  newPriceUsd: string
): Promise<void> {
  const gid = variantId.startsWith('gid://') ? variantId : buildShopifyGid('ProductVariant', variantId);

  await executeMutation(PRODUCT_VARIANT_UPDATE_MUTATION, {
    input: {
      id: gid,
      price: newPriceUsd,
    },
  });
}

/**
 * Publish product to online store
 */
export async function publishProduct(productId: string): Promise<void> {
  const gid = productId.startsWith('gid://') ? productId : buildShopifyGid('Product', productId);

  // Get the online store publication ID (this would typically be retrieved once and cached)
  // For now, we skip publishing as it requires knowing the publication ID
  console.log(`[Shopify] Product ${productId} created. Manual publishing may be required.`);
}

// ============================================================================
// Main Sync Function (Hybrid Architecture - Option D)
// ============================================================================

interface SyncProductOptions {
  /** USD exchange rate (KRW to USD) */
  exchangeRate: number;
  /** Force create new Shopify Product even if canonical exists */
  forceCreate?: boolean;
}

/**
 * Sync a PayNShip product to Shopify using Canonical-based deduplication
 *
 * Hybrid Architecture Flow:
 * 1. Generate canonical hash (name + category + image)
 * 2. Check if CanonicalProduct with same hash exists
 *    - If exists: Link this product to existing canonical (reuse Shopify Product)
 *    - If not: Create new Shopify Product → Create CanonicalProduct → Link
 * 3. Update PayNShip DB with Shopify IDs
 *
 * This enables N:1 mapping: Multiple URLs → Single Shopify Product
 *
 * @param product - PayNShip Product from database
 * @param options - Sync options including exchange rate
 * @returns Sync result with Shopify IDs
 */
export async function syncProductToShopify(
  product: Product,
  options: SyncProductOptions
): Promise<SyncResult> {
  const { exchangeRate, forceCreate = false } = options;

  // Calculate USD price (for Shopify Product creation)
  const priceUsd = (product.priceKrw / exchangeRate).toFixed(2);

  // 1. Check for existing CanonicalProduct via hash
  const canonicalHash = createCanonicalHashFromProduct(product);
  const existingCanonical = await findByCanonicalHash(canonicalHash);

  if (existingCanonical && !forceCreate) {
    // 2a. Canonical exists - link to existing Shopify Product
    console.log(`[Shopify] Found existing canonical for "${product.name}", linking...`);

    await linkProductToCanonical(product.id, existingCanonical.id);

    return {
      shopifyProductId: existingCanonical.shopifyProductId,
      shopifyVariantId: existingCanonical.shopifyVariantId,
      isNew: false,
    };
  }

  // 2b. No canonical exists - create new Shopify Product
  console.log(`[Shopify] Creating new Shopify Product: ${product.name}`);

  const metafields: ShopifyMetafieldInput[] = [
    {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEYS.SOURCE_URL,
      value: product.sourceUrl,
      type: 'url',
    },
    {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEYS.PRICE_KRW,
      value: String(product.priceKrw),
      type: 'number_decimal',
    },
    {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEYS.WEIGHT_KG,
      value: String(product.weightKg),
      type: 'number_decimal',
    },
    {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEYS.PAYNS_PRODUCT_ID,
      value: product.id,
      type: 'single_line_text_field',
    },
    // Hybrid Architecture: Canonical hash for deduplication
    {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEYS.CANONICAL_HASH,
      value: canonicalHash,
      type: 'single_line_text_field',
    },
    // Initial source URLs array (will be updated as more URLs are linked)
    {
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEYS.SOURCE_URLS,
      value: JSON.stringify([product.sourceUrl]),
      type: 'json',
    },
  ];

  // Add optional metafields
  if (product.hsCode) {
    metafields.push({
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEYS.HS_CODE,
      value: product.hsCode,
      type: 'single_line_text_field',
    });
  }

  if (product.origin) {
    metafields.push({
      namespace: METAFIELD_NAMESPACE,
      key: METAFIELD_KEYS.ORIGIN,
      value: product.origin,
      type: 'single_line_text_field',
    });
  }

  const input: ShopifyProductInput = {
    title: product.name,
    descriptionHtml: product.description || undefined,
    vendor: 'PayNShip Korea Proxy',
    productType: product.category,
    tags: ['korean', 'proxy'],
    status: 'ACTIVE',
    variants: [{
      price: priceUsd,
      weight: product.weightKg,
      weightUnit: 'KILOGRAMS',
      inventoryPolicy: 'CONTINUE',
    }],
    metafields,
  };

  const createdProduct = await createProduct(input);
  const shopifyProductId = extractShopifyId(createdProduct.id);
  const shopifyVariantId = extractShopifyId(createdProduct.variants.edges[0]?.node.id || '');

  // 3. Create CanonicalProduct record
  const canonical = await createCanonical(product, shopifyProductId, shopifyVariantId);
  console.log(`[Shopify] Created canonical product: ${canonical.id}`);

  // 4. Link this product to the new canonical
  await linkProductToCanonical(product.id, canonical.id);

  return {
    shopifyProductId,
    shopifyVariantId,
    isNew: true,
  };
}

// Export createProduct as createShopifyProduct for external use
export { createProduct as createShopifyProduct };

/**
 * Batch sync multiple products to Shopify
 */
export async function batchSyncProducts(
  products: Product[],
  options: SyncProductOptions
): Promise<Map<string, SyncResult>> {
  const results = new Map<string, SyncResult>();

  for (const product of products) {
    try {
      const result = await syncProductToShopify(product, options);
      results.set(product.id, result);
    } catch (error) {
      console.error(`[Shopify] Failed to sync product ${product.id}:`, error);
      // Continue with next product
    }
  }

  return results;
}
