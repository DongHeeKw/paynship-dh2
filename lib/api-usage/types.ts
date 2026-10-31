/**
 * API Usage Tracking Types
 *
 * @module lib/api-usage/types
 */

// ============================================================================
// Service Types
// ============================================================================

export type ApiService =
  | 'browserless'
  | 'scrapingbee'
  | 'tavily'
  | 'unipass'
  | 'naver'
  | 'local';

export type ApiOperation =
  | 'scrape'           // Scraper: fetch HTML
  | 'search'           // Naver/Tavily: search query
  | 'enrich'           // Tavily: product enrichment
  | 'screenshot'       // Browserless: screenshot
  | 'pdf';             // Browserless: PDF generation

// ============================================================================
// Logging Input
// ============================================================================

export interface ApiUsageLogInput {
  service: ApiService;
  operation: ApiOperation;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
  latencyMs?: number;
  sessionId?: string;
  productUrl?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Service Pricing (estimated costs per request)
// ============================================================================

export interface ServicePricing {
  service: ApiService;
  costPerRequest: number;      // USD per request
  creditsPerRequest?: number;  // For credit-based services
  freeLimit?: number;          // Free tier limit per month
  notes?: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface ApiUsageStats {
  service: ApiService;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  totalCostUsd: number;
  avgLatencyMs: number;
}

export interface ApiUsageSummary {
  period: string;              // "today", "week", "month"
  totalRequests: number;
  totalCostUsd: number;
  byService: ApiUsageStats[];
}
