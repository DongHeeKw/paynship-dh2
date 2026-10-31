/**
 * API Usage Logger
 *
 * Centralized logging for all external API calls.
 * Tracks usage, costs, and performance for monitoring and analytics.
 *
 * @module lib/api-usage/logger
 */

import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { ApiUsageLogInput, ApiService, ApiOperation } from './types';
import { calculateApiCost } from './pricing';
import logger from '@/lib/utils/logger';

// ============================================================================
// Main Logger Function
// ============================================================================

/**
 * Log an API usage event to the database
 *
 * @example
 * ```ts
 * await logApiUsage({
 *   service: 'browserless',
 *   operation: 'scrape',
 *   endpoint: 'https://example.com',
 *   success: true,
 *   latencyMs: 1500,
 *   sessionId: 'session-123',
 * });
 * ```
 */
export async function logApiUsage(input: ApiUsageLogInput): Promise<void> {
  try {
    // Calculate cost
    const { costUsd, credits } = calculateApiCost(
      input.service,
      input.metadata?.creditsUsed as number | undefined
    );

    await prisma.apiUsage.create({
      data: {
        service: input.service,
        operation: input.operation,
        endpoint: input.endpoint,
        method: input.method || 'GET',
        statusCode: input.statusCode,
        success: input.success,
        errorMessage: input.errorMessage,
        latencyMs: input.latencyMs,
        costUsd,
        credits,
        sessionId: input.sessionId,
        productUrl: input.productUrl,
        metadata: (input.metadata as Prisma.InputJsonValue) || undefined,
      },
    });
  } catch (error) {
    // Don't let logging failures affect the main flow
    logger.error('[ApiUsage] Failed to log API usage:', error);
  }
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

/**
 * Create a timing wrapper for API calls
 *
 * @example
 * ```ts
 * const { result, log } = await withApiLogging(
 *   'browserless',
 *   'scrape',
 *   async () => await fetchPage(url),
 *   { productUrl: url, sessionId }
 * );
 * ```
 */
export async function withApiLogging<T>(
  service: ApiService,
  operation: ApiOperation,
  fn: () => Promise<T>,
  context?: {
    endpoint?: string;
    sessionId?: string;
    productUrl?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ result: T; latencyMs: number }> {
  const startTime = Date.now();
  let success = true;
  let errorMessage: string | undefined;
  let statusCode: number | undefined;
  let result: T;

  try {
    result = await fn();
    return { result, latencyMs: Date.now() - startTime };
  } catch (error) {
    success = false;
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    const latencyMs = Date.now() - startTime;

    // Log asynchronously (don't await)
    logApiUsage({
      service,
      operation,
      endpoint: context?.endpoint,
      statusCode,
      success,
      errorMessage,
      latencyMs,
      sessionId: context?.sessionId,
      productUrl: context?.productUrl,
      metadata: context?.metadata,
    }).catch(() => {
      // Silently ignore logging errors
    });
  }
}

/**
 * Log scraper backend usage
 */
export async function logScraperUsage(params: {
  backend: 'browserless' | 'scrapingbee' | 'local';
  url: string;
  success: boolean;
  latencyMs: number;
  statusCode?: number;
  errorMessage?: string;
  sessionId?: string;
  creditsUsed?: number;
}): Promise<void> {
  await logApiUsage({
    service: params.backend,
    operation: 'scrape',
    endpoint: params.url,
    method: 'GET',
    statusCode: params.statusCode,
    success: params.success,
    errorMessage: params.errorMessage,
    latencyMs: params.latencyMs,
    sessionId: params.sessionId,
    productUrl: params.url,
    metadata: params.creditsUsed ? { creditsUsed: params.creditsUsed } : undefined,
  });
}

/**
 * Log Tavily search/enrich usage
 */
export async function logTavilyUsage(params: {
  operation: 'search' | 'enrich';
  query: string;
  success: boolean;
  latencyMs: number;
  resultsCount?: number;
  errorMessage?: string;
  sessionId?: string;
  productUrl?: string;
}): Promise<void> {
  await logApiUsage({
    service: 'tavily',
    operation: params.operation,
    endpoint: `search: ${params.query.slice(0, 100)}`,
    success: params.success,
    errorMessage: params.errorMessage,
    latencyMs: params.latencyMs,
    sessionId: params.sessionId,
    productUrl: params.productUrl,
    metadata: { query: params.query, resultsCount: params.resultsCount },
  });
}

/**
 * Log Naver Shopping API usage
 */
export async function logNaverUsage(params: {
  query: string;
  success: boolean;
  latencyMs: number;
  resultsCount?: number;
  errorMessage?: string;
  sessionId?: string;
}): Promise<void> {
  await logApiUsage({
    service: 'naver',
    operation: 'search',
    endpoint: `naver-shopping: ${params.query.slice(0, 100)}`,
    success: params.success,
    errorMessage: params.errorMessage,
    latencyMs: params.latencyMs,
    sessionId: params.sessionId,
    metadata: { query: params.query, resultsCount: params.resultsCount },
  });
}
