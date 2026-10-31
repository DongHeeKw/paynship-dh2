/**
 * Shopify Metafield Strategy
 *
 * Defines namespace and keys for custom product data.
 * Used for source URL deduplication and Korean product metadata.
 *
 * @module lib/shopify/metafields
 */

/**
 * Metafield namespace for PayNShip proxy service
 */
export const METAFIELD_NAMESPACE = 'proxy';

/**
 * Metafield keys for product data
 */
export const METAFIELD_KEYS = {
  /** Original Korean shopping mall URL (used for deduplication) */
  SOURCE_URL: 'source_url',

  /** Original KRW price */
  PRICE_KRW: 'price_krw',

  /** Product weight in kg */
  WEIGHT_KG: 'weight_kg',

  /** HS Code for customs */
  HS_CODE: 'hs_code',

  /** Country of origin */
  ORIGIN: 'origin',

  /** Timestamp when product was scraped */
  SCRAPED_AT: 'scraped_at',

  /** PayNShip internal product ID */
  PAYNS_PRODUCT_ID: 'product_id',

  /** Original store name (Coupang, Naver, etc.) */
  STORE_NAME: 'store_name',

  // === Hybrid Architecture (Option D) - Added 2025-12 ===

  /** Canonical hash for product deduplication (MD5 of name+category+image) */
  CANONICAL_HASH: 'canonical_hash',

  /** JSON array of all source URLs mapped to this Shopify Product */
  SOURCE_URLS: 'source_urls',
} as const;

export type MetafieldKey = typeof METAFIELD_KEYS[keyof typeof METAFIELD_KEYS];

/**
 * Build a metafield search query for finding products by source URL
 */
export function buildSourceUrlQuery(sourceUrl: string): string {
  return `metafields.${METAFIELD_NAMESPACE}.${METAFIELD_KEYS.SOURCE_URL}:'${sourceUrl}'`;
}
