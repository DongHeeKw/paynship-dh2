/**
 * Canonical Product Module
 *
 * Manages product deduplication and grouping for hybrid Shopify architecture.
 * Multiple PayNShip Products (different URLs) can map to a single Shopify Product
 * via the CanonicalProduct table.
 *
 * @module lib/shopify/canonical
 */

import { createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import type { Product, CanonicalProduct, Prisma } from '@prisma/client';
import { updateProductPrice } from './products';
import { DEFAULT_EXCHANGE_RATE } from '@/lib/calculator/exchange-rate';

// ============================================================================
// Types
// ============================================================================

export interface CanonicalHashInput {
  name: string;
  category?: string | null;
  imageUrl?: string | null;
}

export interface FindOrCreateResult {
  canonical: CanonicalProduct;
  created: boolean;
}

// ============================================================================
// Hash Generation
// ============================================================================

/**
 * Normalize product name for canonical matching
 * - Lowercase
 * - Remove special characters (brackets, quotes, etc.)
 * - Remove common Korean postfixes (앨범, 정품, etc.)
 * - Collapse multiple spaces
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\[\](){}'"「」『』【】]/g, '') // Remove brackets and quotes
    .replace(/\s*(앨범|정품|새제품|무료배송|한정판|특가)\s*/gi, '') // Remove common Korean postfixes
    .replace(/\s*(album|authentic|new|free shipping|limited|sale)\s*/gi, '') // Remove common English postfixes
    .replace(/[^\w\s가-힣]/g, '') // Keep only alphanumeric, spaces, and Korean
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Hash image URL for comparison
 * Extracts the core image path, ignoring CDN prefixes and query params
 */
function hashImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return 'no-image';

  try {
    const url = new URL(imageUrl);
    // Extract pathname without query params
    return createHash('md5').update(url.pathname).digest('hex').slice(0, 8);
  } catch {
    // If URL parsing fails, hash the whole string
    return createHash('md5').update(imageUrl).digest('hex').slice(0, 8);
  }
}

/**
 * Create a canonical hash for product deduplication
 * Uses: normalized name + category + image hash
 *
 * @example
 * "BTS 앨범 [Proof]" (coupang) → hash: abc123
 * "BTS - Proof Album" (naver) → hash: abc123 (same!)
 */
export function createCanonicalHash(input: CanonicalHashInput): string {
  const normalized = {
    name: normalizeProductName(input.name),
    category: (input.category || 'unknown').toLowerCase().trim(),
    imageHash: hashImageUrl(input.imageUrl),
  };

  const hashInput = JSON.stringify(normalized);
  return createHash('md5').update(hashInput).digest('hex');
}

/**
 * Create canonical hash from a Product model
 */
export function createCanonicalHashFromProduct(product: Product): string {
  return createCanonicalHash({
    name: product.name,
    category: product.category,
    imageUrl: product.imageUrl,
  });
}

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Find a canonical product by its hash
 */
export async function findByCanonicalHash(
  hash: string
): Promise<CanonicalProduct | null> {
  return prisma.canonicalProduct.findUnique({
    where: { canonicalHash: hash },
  });
}

/**
 * Find or create a canonical product for a given product
 * If a canonical with the same hash exists, returns it
 * Otherwise, returns null (caller must create Shopify Product first)
 */
export async function findCanonicalForProduct(
  product: Product
): Promise<CanonicalProduct | null> {
  const hash = createCanonicalHashFromProduct(product);
  return findByCanonicalHash(hash);
}

/**
 * Create a new canonical product record
 * Should be called AFTER creating the Shopify Product
 */
export async function createCanonical(
  product: Product,
  shopifyProductId: string,
  shopifyVariantId: string
): Promise<CanonicalProduct> {
  const hash = createCanonicalHashFromProduct(product);

  return prisma.canonicalProduct.create({
    data: {
      canonicalHash: hash,
      name: product.name,
      shopifyProductId,
      shopifyVariantId,
      lowestPriceProductId: product.id,
      lowestPriceKrw: Math.round(product.priceKrw),
      lowestPriceUpdatedAt: new Date(),
    },
  });
}

/**
 * Link a product to an existing canonical
 * Also updates the Product's shopifyProductId and shopifyVariantId
 */
export async function linkProductToCanonical(
  productId: string,
  canonicalId: string
): Promise<Product> {
  const canonical = await prisma.canonicalProduct.findUnique({
    where: { id: canonicalId },
  });

  if (!canonical) {
    throw new Error(`Canonical product not found: ${canonicalId}`);
  }

  // Update the product with canonical link and Shopify IDs
  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      canonicalProductId: canonicalId,
      shopifyProductId: canonical.shopifyProductId,
      shopifyVariantId: canonical.shopifyVariantId,
      shopifySyncedAt: new Date(),
    },
  });

  // Check if this product has a lower price
  await updateLowestPrice(canonicalId);

  return updated;
}

// ============================================================================
// Lowest Price Management
// ============================================================================

/**
 * Update the lowest price tracking for a canonical product
 * Compares all linked products and updates the canonical record
 */
export async function updateLowestPrice(canonicalId: string): Promise<void> {
  const products = await prisma.product.findMany({
    where: { canonicalProductId: canonicalId },
    orderBy: { priceKrw: 'asc' },
  });

  if (products.length === 0) {
    return;
  }

  const lowest = products[0];

  const canonical = await prisma.canonicalProduct.update({
    where: { id: canonicalId },
    data: {
      lowestPriceProductId: lowest.id,
      lowestPriceKrw: Math.round(lowest.priceKrw),
      lowestPriceUpdatedAt: new Date(),
    },
  });

  // Push updated price to Shopify (fire-and-forget with error logging)
  if (canonical.shopifyVariantId) {
    const priceUsd = (Math.round(lowest.priceKrw) / DEFAULT_EXCHANGE_RATE).toFixed(2);
    updateProductPrice(canonical.shopifyVariantId, priceUsd).catch((err) => {
      console.error(`[Canonical] Failed to push price update to Shopify for variant ${canonical.shopifyVariantId}:`, err);
    });
  }
}

/**
 * Get the lowest price product for a canonical
 */
export async function getLowestPriceProduct(
  canonicalId: string
): Promise<Product | null> {
  const canonical = await prisma.canonicalProduct.findUnique({
    where: { id: canonicalId },
  });

  if (!canonical?.lowestPriceProductId) {
    return null;
  }

  return prisma.product.findUnique({
    where: { id: canonical.lowestPriceProductId },
  });
}

/**
 * Get all products for a canonical (all URLs)
 */
export async function getCanonicalProducts(
  canonicalId: string
): Promise<Product[]> {
  return prisma.product.findMany({
    where: { canonicalProductId: canonicalId },
    orderBy: { priceKrw: 'asc' },
  });
}

// ============================================================================
// Price History
// ============================================================================

interface PriceHistoryEntry {
  date: string;
  priceKrw: number;
}

/**
 * Add a price history entry for a product
 */
export async function addPriceHistoryEntry(
  productId: string,
  priceKrw: number
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { priceHistory: true },
  });

  // Cast Prisma's JsonValue to our type via unknown
  const history: PriceHistoryEntry[] =
    (product?.priceHistory as unknown as PriceHistoryEntry[]) || [];

  // Add new entry
  history.push({
    date: new Date().toISOString(),
    priceKrw: Math.round(priceKrw),
  });

  // Keep only last 30 entries
  const trimmedHistory = history.slice(-30);

  await prisma.product.update({
    where: { id: productId },
    data: {
      // Cast back to Prisma's expected JSON type
      priceHistory: trimmedHistory as unknown as Prisma.InputJsonValue,
      lastPriceCheck: new Date(),
    },
  });
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Check if a product is already linked to a canonical
 */
export async function isProductLinked(productId: string): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { canonicalProductId: true },
  });

  return !!product?.canonicalProductId;
}

/**
 * Get canonical with all its products
 */
export async function getCanonicalWithProducts(canonicalId: string) {
  return prisma.canonicalProduct.findUnique({
    where: { id: canonicalId },
    include: {
      products: {
        orderBy: { priceKrw: 'asc' },
      },
    },
  });
}
