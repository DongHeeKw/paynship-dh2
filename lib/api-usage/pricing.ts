/**
 * API Service Pricing Constants
 *
 * Estimated costs per request for each external API service.
 * Update these values based on actual pricing from service providers.
 *
 * @module lib/api-usage/pricing
 */

import type { ApiService, ServicePricing } from './types';

// ============================================================================
// Service Pricing Configuration
// ============================================================================

export const SERVICE_PRICING: Record<ApiService, ServicePricing> = {
  // Browserless.io - https://www.browserless.io/pricing
  // Estimate: ~$0.005 per request on Pro plan
  browserless: {
    service: 'browserless',
    costPerRequest: 0.005,
    notes: 'Pro plan estimate. Actual cost varies by usage time.',
  },

  // ScrapingBee - https://www.scrapingbee.com/pricing
  // Standard: 1000 credits = $49 → ~$0.049 per credit
  // Each request uses 1-25 credits depending on features
  scrapingbee: {
    service: 'scrapingbee',
    costPerRequest: 0.05,  // Assuming ~1 credit per basic request
    creditsPerRequest: 1,
    notes: 'Cost varies by JS rendering, premium proxies, etc.',
  },

  // Tavily - https://tavily.com/pricing
  // Starter: 1000 req/month free, then ~$0.01 per request
  tavily: {
    service: 'tavily',
    costPerRequest: 0.01,
    freeLimit: 1000,
    notes: 'First 1000 req/month free on Starter plan.',
  },

  // UNI-PASS (Korean Customs)
  // Government API: usually no per-request billing for approved integrations
  unipass: {
    service: 'unipass',
    costPerRequest: 0,
    notes: 'Government customs API (cost depends on contract/usage policy).',
  },

  // Naver Shopping API - Free but rate limited
  // 10,000 requests per day
  naver: {
    service: 'naver',
    costPerRequest: 0,
    freeLimit: 10000,  // per day
    notes: 'Free but rate limited to 10,000 req/day.',
  },

  // Local Patchright - Free
  local: {
    service: 'local',
    costPerRequest: 0,
    notes: 'Free local browser automation.',
  },
};

// ============================================================================
// Cost Calculation
// ============================================================================

/**
 * Calculate estimated cost for an API call
 */
export function calculateApiCost(
  service: ApiService,
  creditsUsed?: number
): { costUsd: number; credits?: number } {
  const pricing = SERVICE_PRICING[service];

  if (service === 'scrapingbee' && creditsUsed) {
    // ScrapingBee: cost based on credits used
    const costPerCredit = pricing.costPerRequest / (pricing.creditsPerRequest || 1);
    return {
      costUsd: creditsUsed * costPerCredit,
      credits: creditsUsed,
    };
  }

  return {
    costUsd: pricing.costPerRequest,
    credits: pricing.creditsPerRequest,
  };
}

/**
 * Get pricing info for display
 */
export function getPricingInfo(service: ApiService): ServicePricing {
  return SERVICE_PRICING[service];
}
