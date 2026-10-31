/**
 * Shopify GraphQL Client
 *
 * GraphQL client with Leaky Bucket rate limiting for Shopify Admin API.
 *
 * @module lib/shopify/client
 */

import {
  SHOPIFY_CONFIG,
  getGraphQLEndpoint,
  RATE_LIMIT_CONFIG,
  isShopifyEnabled,
} from './config';
import {
  GraphQLResponse,
  QueryCost,
  UserError,
  ShopifyAPIError,
  ShopifyRateLimitError,
} from './types';

// ============================================================================
// Rate Limiter (Leaky Bucket)
// ============================================================================

interface RateLimiterState {
  available: number;
  lastRestore: number;
}

const rateLimiter: RateLimiterState = {
  available: RATE_LIMIT_CONFIG.initialAvailable,
  lastRestore: Date.now(),
};

/**
 * Restore rate limit credits based on elapsed time
 */
function restoreCredits(): void {
  const now = Date.now();
  const elapsedSeconds = (now - rateLimiter.lastRestore) / 1000;
  const restored = elapsedSeconds * RATE_LIMIT_CONFIG.restoreRate;

  rateLimiter.available = Math.min(
    RATE_LIMIT_CONFIG.maxAvailable,
    rateLimiter.available + restored
  );
  rateLimiter.lastRestore = now;
}

/**
 * Wait for rate limit capacity
 */
async function waitForCapacity(estimatedCost: number): Promise<void> {
  restoreCredits();

  if (rateLimiter.available >= estimatedCost) {
    rateLimiter.available -= estimatedCost;
    return;
  }

  // Calculate wait time
  const deficit = estimatedCost - rateLimiter.available;
  const waitTimeMs = (deficit / RATE_LIMIT_CONFIG.restoreRate) * 1000;

  console.log(`[Shopify] Rate limit: waiting ${Math.ceil(waitTimeMs)}ms for capacity`);
  await new Promise(resolve => setTimeout(resolve, waitTimeMs));

  // Retry
  return waitForCapacity(estimatedCost);
}

/**
 * Update rate limiter state from API response
 */
function updateFromResponse(cost: QueryCost): void {
  rateLimiter.available = cost.throttleStatus.currentlyAvailable;
  rateLimiter.lastRestore = Date.now();
}

// ============================================================================
// GraphQL Client
// ============================================================================

export interface ExecuteGraphQLOptions {
  /** Estimated query cost for rate limiting (default: 10) */
  estimatedCost?: number;
  /** Retry on rate limit (default: true) */
  retryOnRateLimit?: boolean;
  /** Max retries (default: 3) */
  maxRetries?: number;
}

/**
 * Execute a GraphQL query/mutation against Shopify Admin API
 */
export async function executeGraphQL<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: ExecuteGraphQLOptions = {}
): Promise<T> {
  const {
    estimatedCost = 10,
    retryOnRateLimit = true,
    maxRetries = RATE_LIMIT_CONFIG.maxRetries,
  } = options;

  // Check if Shopify is configured
  if (!(await isShopifyEnabled())) {
    throw new ShopifyAPIError(
      'Shopify is not configured. Missing environment variables.',
      [],
      500
    );
  }

  // Wait for rate limit capacity
  await waitForCapacity(estimatedCost);

  const endpoint = getGraphQLEndpoint();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_CONFIG.adminAccessToken,
        },
        body: JSON.stringify({ query, variables }),
      });

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 429 && retryOnRateLimit && attempt < maxRetries) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10) * 1000;
          console.log(`[Shopify] Rate limited (429). Retrying in ${retryAfter}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue;
        }

        throw new ShopifyAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          [],
          response.status
        );
      }

      const result: GraphQLResponse<T> = await response.json();

      // Update rate limiter from response
      if (result.extensions?.cost) {
        updateFromResponse(result.extensions.cost);
      }

      // Handle GraphQL errors
      if (result.errors && result.errors.length > 0) {
        // Check for throttled error
        const throttledError = result.errors.find(
          e => e.extensions?.code === 'THROTTLED'
        );

        if (throttledError && retryOnRateLimit && attempt < maxRetries) {
          console.log('[Shopify] Throttled. Retrying...');
          await new Promise(resolve =>
            setTimeout(resolve, RATE_LIMIT_CONFIG.retryAfterMs)
          );
          continue;
        }

        throw new ShopifyAPIError(
          result.errors.map(e => e.message).join(', '),
          [],
          undefined,
          result.errors
        );
      }

      if (!result.data) {
        throw new ShopifyAPIError('No data in response');
      }

      return result.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (error instanceof ShopifyAPIError) {
        throw error;
      }

      // Network error - retry
      if (attempt < maxRetries) {
        console.log(`[Shopify] Request failed. Retrying (${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve =>
          setTimeout(resolve, RATE_LIMIT_CONFIG.retryAfterMs * (attempt + 1))
        );
        continue;
      }
    }
  }

  throw lastError || new ShopifyAPIError('Unknown error after retries');
}

/**
 * Execute a mutation and check for userErrors
 */
export async function executeMutation<T>(
  mutation: string,
  variables?: Record<string, unknown>,
  options?: ExecuteGraphQLOptions
): Promise<T> {
  const result = await executeGraphQL<T>(mutation, variables, options);

  // Check for userErrors in mutation result
  // The result is expected to have a single key with the mutation name
  const resultObj = result as Record<string, MutationResult>;
  const mutationKey = Object.keys(resultObj)[0];
  const mutationResult = resultObj[mutationKey];

  if (mutationResult?.userErrors && mutationResult.userErrors.length > 0) {
    throw new ShopifyAPIError(
      `Mutation failed: ${mutationResult.userErrors.map((e: UserError) => e.message).join(', ')}`,
      mutationResult.userErrors
    );
  }

  return result;
}

interface MutationResult {
  userErrors?: UserError[];
  [key: string]: unknown;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract numeric ID from Shopify GID
 * @example "gid://shopify/Product/123" -> "123"
 */
export function extractShopifyId(gid: string): string {
  const match = gid.match(/\/(\d+)$/);
  return match ? match[1] : gid;
}

/**
 * Build a Shopify GID from resource type and ID
 * @example ("Product", "123") -> "gid://shopify/Product/123"
 */
export function buildShopifyGid(resource: string, id: string): string {
  return `gid://shopify/${resource}/${id}`;
}

/**
 * Get current rate limiter state (for debugging)
 */
export function getRateLimiterState(): { available: number; lastRestore: number } {
  restoreCredits();
  return { ...rateLimiter };
}
