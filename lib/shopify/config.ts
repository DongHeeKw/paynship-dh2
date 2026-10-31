/**
 * Shopify Configuration
 *
 * Environment variables and settings for Shopify integration.
 * AdminSettings controls runtime toggle (can disable even if env vars are set).
 *
 * @module lib/shopify/config
 */

import { getAdminSettings } from '@/lib/admin/cache';

// Environment Variables
export const SHOPIFY_CONFIG = {
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN || '',
  adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
  webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || '',
  apiVersion: process.env.SHOPIFY_API_VERSION || '2025-07',
} as const;

/**
 * Validate required environment variables
 */
export function validateShopifyConfig(): { valid: boolean; missing: string[] } {
  const required = [
    'SHOPIFY_STORE_DOMAIN',
    'SHOPIFY_ADMIN_ACCESS_TOKEN',
  ];

  const missing = required.filter(key => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if Shopify integration is enabled (synchronous - env vars only)
 * Use this for quick checks where DB access isn't needed.
 */
export function isShopifyConfigured(): boolean {
  const { valid } = validateShopifyConfig();
  return valid;
}

/**
 * Check if Shopify integration is enabled (async - includes AdminSettings)
 *
 * Checks:
 * 1. Environment variables are set (SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN)
 * 2. AdminSettings.shopifyEnabled is true
 *
 * Use this for actual sync operations.
 */
export async function isShopifyEnabled(): Promise<boolean> {
  // First check env vars
  if (!isShopifyConfigured()) {
    return false;
  }

  // Then check AdminSettings
  try {
    const settings = await getAdminSettings();
    return settings.shopifyEnabled ?? false;
  } catch {
    // DB error - default to disabled for safety
    return false;
  }
}

/**
 * Check if auto-sync is enabled (async)
 * Auto-sync: automatically sync products to Shopify when scraped
 */
export async function isShopifyAutoSyncEnabled(): Promise<boolean> {
  // Must be enabled first
  if (!(await isShopifyEnabled())) {
    return false;
  }

  try {
    const settings = await getAdminSettings();
    return settings.shopifyAutoSync ?? true;
  } catch {
    return false;
  }
}

// Legacy alias for backward compatibility
export { isShopifyConfigured as isShopifyEnabled_sync };

/**
 * Get GraphQL endpoint URL
 */
export function getGraphQLEndpoint(): string {
  const { storeDomain, apiVersion } = SHOPIFY_CONFIG;
  return `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
}

/**
 * Default rate limit settings (Shopify Leaky Bucket)
 */
export const RATE_LIMIT_CONFIG = {
  maxAvailable: 1000,      // Maximum bucket size
  restoreRate: 50,         // Points restored per second
  initialAvailable: 1000,  // Starting points
  retryAfterMs: 1000,      // Default wait time on throttle
  maxRetries: 3,           // Max retry attempts
} as const;
