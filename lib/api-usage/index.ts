/**
 * API Usage Tracking Module
 *
 * Centralized tracking for all external API calls including:
 * - Scraper backends (Browserless, ScrapingBee, Local)
 * - Tavily web search
 * - Naver Shopping API
 *
 * @module lib/api-usage
 */

// Logger functions
export {
  logApiUsage,
  withApiLogging,
  logScraperUsage,
  logTavilyUsage,
  logNaverUsage,
} from './logger';

// Pricing
export {
  SERVICE_PRICING,
  calculateApiCost,
  getPricingInfo,
} from './pricing';

// Types
export type {
  ApiService,
  ApiOperation,
  ApiUsageLogInput,
  ServicePricing,
  ApiUsageStats,
  ApiUsageSummary,
} from './types';
