/**
 * Business Settings Module
 *
 * SSoT for all business-related settings.
 * Values are resolved from DB (AdminSettings) with fallback to constants.
 *
 * @module lib/business
 */

export {
  // Async Resolvers (use DB values, throw on failure)
  getServiceFeeRate,
  getOrderLimits,
  getDefaultExchangeRate,
  getEnabledCountries,
  getShippingSettings,
  getDimFactor,
  getAllBusinessSettings,

  // Sync Resolvers (fallback only - for Mock/Initialization)
  getServiceFeeRateSync,
  getOrderLimitsSync,
  getDefaultExchangeRateSync,
  getEnabledCountriesSync,
  getDimFactorSync,

  // Rate Table Resolvers (DB tables)
  getShippingRates,
  getShippingRateByCountry,
  getHsCodeRates,
  getHsCodeRate,
  getCountryTaxRates,
  getCountryTaxRate,
  invalidateRatesCache,

  // Feature Settings Resolvers
  getRouterSettings,
  getTavilySettings,
  getScraperScoringSettings,
  getOptionPriceSettings,

  // Category Mapping Resolvers
  getCategoryMappings,
  getCategoryMapping,
  getEstimatedWeightByCategory,
  getEstimatedDimensionsByCategory,
  getHsCodePrefixByCategory,
  invalidateCategoryMappingsCache,

  // Scraper Timeout
  getScraperTimeoutMs,

  // Cache TTL Resolvers
  getCacheTTLSettings,
  getExchangeRateCacheTtlMs,
  getProductCacheTtlMs,
  getRatesCacheTtlMs,

  // Validation Helpers
  isCountryEnabled,
  validateOrderAmount,

  // Error Class
  BusinessSettingsError,

  // Types
  type OrderLimits,
  type ShippingSettings,
  type BusinessSettings,
  type RouterSettings,
  type TavilySettings,
  type ScraperScoringSettings,
  type OptionPriceSettings,
  type CacheTTLSettings,
} from './settings';

// Category Resolver (SSoT for category-based estimations with alias support)
export {
  // Async Resolvers (DB-backed with alias matching)
  getCategoryEstimates,
  getEstimatedWeight,
  getEstimatedDimensions,
  getHsCodePrefix,
  getCategoryEstimatesBatch,

  // Sync Resolvers (Hardcoded fallback)
  getCategoryEstimatesSync,
  estimateWeightSync,
  estimateDimensionsSync,
  getHsCodePrefixSync,

  // Types
  type CategoryEstimates,
} from './category-resolver';
