/**
 * Business Settings Resolver (SSoT)
 *
 * 비즈니스 설정값의 Single Source of Truth.
 * DB(AdminSettings)에서 값을 가져옴.
 *
 * ⚠️ 에러 처리 정책:
 * - Async Resolvers: DB 실패 시 에러 발생 (Fail-Fast)
 * - Sync Resolvers: Fallback 값 반환 (Mock/초기화 전용)
 *
 * Resolution Order:
 * 1. DB (AdminSettings) → 실제 운영 값
 * 2. Error 발생 (운영 환경에서 DB 실패는 심각한 문제)
 *
 * @module lib/business/settings
 * @see documents/Reference/CONSTANTS_REGISTRY.md
 * @see documents/Plans/Admin-Business-Settings.md
 */

import { getAdminSettings } from '@/lib/admin';
import { prisma } from '@/lib/db/prisma';
import {
  FALLBACK_SERVICE_FEE_RATE,
  FALLBACK_MIN_ORDER_USD,
  FALLBACK_MAX_ORDER_USD,
  FALLBACK_EXCHANGE_RATE,
  FALLBACK_ENABLED_COUNTRIES,
  FALLBACK_DEFAULT_PRODUCT_WEIGHT_KG,
  FALLBACK_MAX_PRODUCT_WEIGHT_KG,
  FALLBACK_DIM_FACTOR,
} from '@/lib/constants/business';
import logger from '@/lib/utils/logger';
import type { ShippingRate, HsCodeRate, CountryTaxRate, CategoryMapping } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface OrderLimits {
  min: number;
  max: number;
}

export interface ShippingSettings {
  enabledCountries: string[];
  defaultProductWeightKg: number;
  maxProductWeightKg: number;
  dimFactor: number;
}

export interface BusinessSettings {
  serviceFeeRate: number;
  orderLimits: OrderLimits;
  defaultExchangeRate: number;
  shipping: ShippingSettings;
}

// ============================================================================
// Error Class
// ============================================================================

/**
 * Business settings error
 * DB 접근 실패 시 발생하는 에러
 */
export class BusinessSettingsError extends Error {
  constructor(
    public readonly setting: string,
    public readonly cause?: unknown
  ) {
    super(`Failed to retrieve business setting: ${setting}`);
    this.name = 'BusinessSettingsError';
  }
}

// ============================================================================
// Individual Resolvers (Async - Throws on failure)
// ============================================================================

/**
 * Get service fee rate
 * @returns Service fee rate (e.g., 0.10 for 10%)
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function getServiceFeeRate(): Promise<number> {
  try {
    const settings = await getAdminSettings();
    return settings.serviceFeeRate ?? FALLBACK_SERVICE_FEE_RATE;
  } catch (error) {
    logger.error('Business', `Failed to get service fee rate: ${error}`);
    throw new BusinessSettingsError('serviceFeeRate', error);
  }
}

/**
 * Get order amount limits
 * @returns Min and max order amounts in USD
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function getOrderLimits(): Promise<OrderLimits> {
  try {
    const settings = await getAdminSettings();
    return {
      min: settings.minOrderAmountUsd ?? FALLBACK_MIN_ORDER_USD,
      max: settings.maxOrderAmountUsd ?? FALLBACK_MAX_ORDER_USD,
    };
  } catch (error) {
    logger.error('Business', `Failed to get order limits: ${error}`);
    throw new BusinessSettingsError('orderLimits', error);
  }
}

/**
 * Get default exchange rate (Fallback for API failures)
 * @returns Exchange rate (KRW per USD)
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function getDefaultExchangeRate(): Promise<number> {
  try {
    const settings = await getAdminSettings();
    return settings.defaultExchangeRate ?? FALLBACK_EXCHANGE_RATE;
  } catch (error) {
    logger.error('Business', `Failed to get default exchange rate: ${error}`);
    throw new BusinessSettingsError('defaultExchangeRate', error);
  }
}

/**
 * Get enabled countries for shipping
 * @returns Array of country codes
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function getEnabledCountries(): Promise<string[]> {
  try {
    const settings = await getAdminSettings();
    return settings.enabledCountries ?? FALLBACK_ENABLED_COUNTRIES;
  } catch (error) {
    logger.error('Business', `Failed to get enabled countries: ${error}`);
    throw new BusinessSettingsError('enabledCountries', error);
  }
}

/**
 * Get shipping-related settings
 * @returns ShippingSettings object
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function getShippingSettings(): Promise<ShippingSettings> {
  try {
    const settings = await getAdminSettings();
    return {
      enabledCountries: settings.enabledCountries ?? FALLBACK_ENABLED_COUNTRIES,
      defaultProductWeightKg: settings.defaultProductWeightKg ?? FALLBACK_DEFAULT_PRODUCT_WEIGHT_KG,
      maxProductWeightKg: settings.maxProductWeightKg ?? FALLBACK_MAX_PRODUCT_WEIGHT_KG,
      dimFactor: settings.dimFactor ?? FALLBACK_DIM_FACTOR,
    };
  } catch (error) {
    logger.error('Business', `Failed to get shipping settings: ${error}`);
    throw new BusinessSettingsError('shippingSettings', error);
  }
}

/**
 * Get DIM factor for volumetric weight calculation
 * @returns DIM factor (6000 for K-Packet/EMS, 5000 for DHL/FedEx)
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function getDimFactor(): Promise<number> {
  try {
    const settings = await getAdminSettings();
    return settings.dimFactor ?? FALLBACK_DIM_FACTOR;
  } catch (error) {
    logger.error('Business', `Failed to get DIM factor: ${error}`);
    throw new BusinessSettingsError('dimFactor', error);
  }
}

// ============================================================================
// Sync Versions (Fallback only - for Mock/Initialization)
// ============================================================================

/**
 * ⚠️ Sync versions are for:
 * - Mock mode development
 * - Initial DB record creation
 * - Contexts where async is not possible
 *
 * These return hardcoded fallback values, NOT DB values.
 * Use async versions for production code.
 */

export const getServiceFeeRateSync = () => FALLBACK_SERVICE_FEE_RATE;
export const getOrderLimitsSync = (): OrderLimits => ({
  min: FALLBACK_MIN_ORDER_USD,
  max: FALLBACK_MAX_ORDER_USD,
});
export const getDefaultExchangeRateSync = () => FALLBACK_EXCHANGE_RATE;
export const getEnabledCountriesSync = () => FALLBACK_ENABLED_COUNTRIES;
export const getDimFactorSync = () => FALLBACK_DIM_FACTOR;

// ============================================================================
// Aggregate Resolver
// ============================================================================

/**
 * Get all business settings at once
 * Useful for batch operations or initialization
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function getAllBusinessSettings(): Promise<BusinessSettings> {
  try {
    const settings = await getAdminSettings();
    return {
      serviceFeeRate: settings.serviceFeeRate ?? FALLBACK_SERVICE_FEE_RATE,
      orderLimits: {
        min: settings.minOrderAmountUsd ?? FALLBACK_MIN_ORDER_USD,
        max: settings.maxOrderAmountUsd ?? FALLBACK_MAX_ORDER_USD,
      },
      defaultExchangeRate: settings.defaultExchangeRate ?? FALLBACK_EXCHANGE_RATE,
      shipping: {
        enabledCountries: settings.enabledCountries ?? FALLBACK_ENABLED_COUNTRIES,
        defaultProductWeightKg: settings.defaultProductWeightKg ?? FALLBACK_DEFAULT_PRODUCT_WEIGHT_KG,
        maxProductWeightKg: settings.maxProductWeightKg ?? FALLBACK_MAX_PRODUCT_WEIGHT_KG,
        dimFactor: settings.dimFactor ?? FALLBACK_DIM_FACTOR,
      },
    };
  } catch (error) {
    logger.error('Business', `Failed to get all business settings: ${error}`);
    throw new BusinessSettingsError('allSettings', error);
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a country is enabled for shipping
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function isCountryEnabled(countryCode: string): Promise<boolean> {
  const countries = await getEnabledCountries();
  return countries.includes(countryCode.toUpperCase());
}

/**
 * Validate order amount against limits
 * @throws {BusinessSettingsError} DB 접근 실패 시
 */
export async function validateOrderAmount(amountUsd: number): Promise<{
  valid: boolean;
  reason?: string;
}> {
  const limits = await getOrderLimits();

  if (amountUsd < limits.min) {
    return {
      valid: false,
      reason: `Minimum order amount is $${limits.min}`,
    };
  }

  if (amountUsd > limits.max) {
    return {
      valid: false,
      reason: `Maximum order amount is $${limits.max}`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Rate Table Resolvers (DB Tables)
// ============================================================================

// In-memory cache for rate tables (refresh every 5 minutes)
let shippingRatesCache: ShippingRate[] | null = null;
let hsCodeRatesCache: HsCodeRate[] | null = null;
let countryTaxRatesCache: CountryTaxRate[] | null = null;
let ratesCacheTime = 0;
const RATES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isRatesCacheValid(): boolean {
  return Date.now() - ratesCacheTime < RATES_CACHE_TTL;
}

function invalidateRatesCache(): void {
  shippingRatesCache = null;
  hsCodeRatesCache = null;
  countryTaxRatesCache = null;
  ratesCacheTime = 0;
}

/**
 * Get all shipping rates from DB
 * @returns Array of ShippingRate records
 */
export async function getShippingRates(): Promise<ShippingRate[]> {
  if (shippingRatesCache && isRatesCacheValid()) {
    return shippingRatesCache;
  }

  try {
    shippingRatesCache = await prisma.shippingRate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    ratesCacheTime = Date.now();
    return shippingRatesCache;
  } catch (error) {
    logger.error('Business', `Failed to get shipping rates: ${error}`);
    throw new BusinessSettingsError('shippingRates', error);
  }
}

/**
 * Get shipping rate for a specific country
 * @param countryCode ISO country code
 * @returns ShippingRate or default (XX) rate
 */
export async function getShippingRateByCountry(countryCode: string): Promise<ShippingRate> {
  const rates = await getShippingRates();
  const rate = rates.find(r => r.countryCode === countryCode.toUpperCase());
  const defaultRate = rates.find(r => r.countryCode === 'XX');

  if (!rate && !defaultRate) {
    throw new BusinessSettingsError('shippingRate', `No rate found for ${countryCode}`);
  }

  return rate || defaultRate!;
}

/**
 * Get all HS code rates from DB
 * @returns Array of HsCodeRate records
 */
export async function getHsCodeRates(): Promise<HsCodeRate[]> {
  if (hsCodeRatesCache && isRatesCacheValid()) {
    return hsCodeRatesCache;
  }

  try {
    hsCodeRatesCache = await prisma.hsCodeRate.findMany({
      where: { isActive: true },
    });
    ratesCacheTime = Date.now();
    return hsCodeRatesCache;
  } catch (error) {
    logger.error('Business', `Failed to get HS code rates: ${error}`);
    throw new BusinessSettingsError('hsCodeRates', error);
  }
}

/**
 * Get duty rate for an HS code
 * @param hsCode 2-6 digit HS code
 * @returns HsCodeRate or default (00) rate
 */
export async function getHsCodeRate(hsCode: string): Promise<HsCodeRate> {
  const rates = await getHsCodeRates();

  // Try exact match first, then prefix matches
  let rate = rates.find(r => r.hsCode === hsCode);
  if (!rate) {
    // Try 4-digit prefix
    rate = rates.find(r => hsCode.startsWith(r.hsCode));
  }
  if (!rate) {
    // Try 2-digit prefix
    rate = rates.find(r => hsCode.substring(0, 2) === r.hsCode);
  }
  if (!rate) {
    // Default rate
    rate = rates.find(r => r.hsCode === '00');
  }

  if (!rate) {
    throw new BusinessSettingsError('hsCodeRate', `No rate found for ${hsCode}`);
  }

  return rate;
}

/**
 * Get all country tax rates from DB
 * @returns Array of CountryTaxRate records
 */
export async function getCountryTaxRates(): Promise<CountryTaxRate[]> {
  if (countryTaxRatesCache && isRatesCacheValid()) {
    return countryTaxRatesCache;
  }

  try {
    countryTaxRatesCache = await prisma.countryTaxRate.findMany({
      where: { isActive: true },
    });
    ratesCacheTime = Date.now();
    return countryTaxRatesCache;
  } catch (error) {
    logger.error('Business', `Failed to get country tax rates: ${error}`);
    throw new BusinessSettingsError('countryTaxRates', error);
  }
}

/**
 * Get tax rate for a specific country
 * @param countryCode ISO country code
 * @returns CountryTaxRate or default (XX) rate
 */
export async function getCountryTaxRate(countryCode: string): Promise<CountryTaxRate> {
  const rates = await getCountryTaxRates();
  const rate = rates.find(r => r.countryCode === countryCode.toUpperCase());
  const defaultRate = rates.find(r => r.countryCode === 'XX');

  if (!rate && !defaultRate) {
    throw new BusinessSettingsError('countryTaxRate', `No rate found for ${countryCode}`);
  }

  return rate || defaultRate!;
}

// ============================================================================
// Router Settings Resolvers
// ============================================================================

export interface RouterSettings {
  confidenceSearch: number;
  confidenceParseUrl: number;
  confidenceCart: number;
  confidenceCheckout: number;
  fallbackThreshold: number;
}

/**
 * Get semantic router confidence thresholds
 */
export async function getRouterSettings(): Promise<RouterSettings> {
  try {
    const settings = await getAdminSettings();
    return {
      confidenceSearch: settings.routerConfidenceSearch ?? 0.75,
      confidenceParseUrl: settings.routerConfidenceParseUrl ?? 0.85,
      confidenceCart: settings.routerConfidenceCart ?? 0.80,
      confidenceCheckout: settings.routerConfidenceCheckout ?? 0.80,
      fallbackThreshold: settings.routerFallbackThreshold ?? 0.70,
    };
  } catch (error) {
    logger.error('Business', `Failed to get router settings: ${error}`);
    throw new BusinessSettingsError('routerSettings', error);
  }
}

// ============================================================================
// Tavily Settings Resolvers
// ============================================================================

export interface TavilySettings {
  maxQueries: number;
  timeoutMs: number;
  retryAttempts: number;
  cacheDays: number;
}

/**
 * Get Tavily API configuration
 */
export async function getTavilySettings(): Promise<TavilySettings> {
  try {
    const settings = await getAdminSettings();
    return {
      maxQueries: settings.tavilyMaxQueries ?? 3,
      timeoutMs: settings.tavilyTimeoutMs ?? 10000,
      retryAttempts: settings.tavilyRetryAttempts ?? 2,
      cacheDays: settings.tavilyCacheDays ?? 7,
    };
  } catch (error) {
    logger.error('Business', `Failed to get Tavily settings: ${error}`);
    throw new BusinessSettingsError('tavilySettings', error);
  }
}

// ============================================================================
// Scraper Settings Resolvers
// ============================================================================

export interface ScraperScoringSettings {
  preferenceThreshold: number;
  speedWeight: number;
  minAttemptsForScore: number;
}

/**
 * Get scraper backend scoring configuration
 */
export async function getScraperScoringSettings(): Promise<ScraperScoringSettings> {
  try {
    const settings = await getAdminSettings();
    return {
      preferenceThreshold: settings.scraperPreferenceThreshold ?? 0.7,
      speedWeight: settings.scraperSpeedWeight ?? 0.2,
      minAttemptsForScore: settings.scraperMinAttemptsForScore ?? 3,
    };
  } catch (error) {
    logger.error('Business', `Failed to get scraper scoring settings: ${error}`);
    throw new BusinessSettingsError('scraperScoringSettings', error);
  }
}

// ============================================================================
// Option Price Validation Settings
// ============================================================================

export interface OptionPriceSettings {
  minKrw: number;
  maxKrw: number;
  maxPct: number;
}

/**
 * Get option price validation configuration
 */
export async function getOptionPriceSettings(): Promise<OptionPriceSettings> {
  try {
    const settings = await getAdminSettings();
    return {
      minKrw: settings.optionPriceMinKrw ?? 100,
      maxKrw: settings.optionPriceMaxKrw ?? 500000,
      maxPct: settings.optionPriceMaxPct ?? 0.5,
    };
  } catch (error) {
    logger.error('Business', `Failed to get option price settings: ${error}`);
    throw new BusinessSettingsError('optionPriceSettings', error);
  }
}

// ============================================================================
// Category Mapping Resolvers
// ============================================================================

// In-memory cache for category mappings
let categoryMappingsCache: CategoryMapping[] | null = null;
let categoryMappingsCacheTime = 0;
const CATEGORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCategoryMappingsCacheValid(): boolean {
  return Date.now() - categoryMappingsCacheTime < CATEGORY_CACHE_TTL;
}

export function invalidateCategoryMappingsCache(): void {
  categoryMappingsCache = null;
  categoryMappingsCacheTime = 0;
}

/**
 * Get all category mappings from DB
 * @returns Array of CategoryMapping records
 */
export async function getCategoryMappings(): Promise<CategoryMapping[]> {
  if (categoryMappingsCache && isCategoryMappingsCacheValid()) {
    return categoryMappingsCache;
  }

  try {
    categoryMappingsCache = await prisma.categoryMapping.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    categoryMappingsCacheTime = Date.now();
    return categoryMappingsCache;
  } catch (error) {
    logger.error('Business', `Failed to get category mappings: ${error}`);
    throw new BusinessSettingsError('categoryMappings', error);
  }
}

/**
 * Get category mapping by category name
 * @param category Category key (e.g., 'fashion', 'beauty')
 * @returns CategoryMapping or default ('other')
 */
export async function getCategoryMapping(category: string): Promise<CategoryMapping | null> {
  const mappings = await getCategoryMappings();
  const normalizedCategory = category.toLowerCase().trim();

  // Try exact match first
  let mapping = mappings.find(m => m.category.toLowerCase() === normalizedCategory);

  // Fallback to 'other'
  if (!mapping) {
    mapping = mappings.find(m => m.category === 'other');
  }

  return mapping || null;
}

/**
 * Get estimated weight by category
 * @param category Category key
 * @returns Estimated weight in kg (default: 0.5)
 */
export async function getEstimatedWeightByCategory(category: string): Promise<number> {
  const mapping = await getCategoryMapping(category);
  return mapping?.estimatedWeightKg ?? 0.5;
}

/**
 * Get estimated dimensions by category
 * @param category Category key
 * @returns Dimensions { l, w, h } in cm
 */
export async function getEstimatedDimensionsByCategory(category: string): Promise<{ l: number; w: number; h: number }> {
  const mapping = await getCategoryMapping(category);
  return {
    l: mapping?.dimensionL ?? 30,
    w: mapping?.dimensionW ?? 20,
    h: mapping?.dimensionH ?? 10,
  };
}

/**
 * Get HS code prefix by category
 * @param category Category key
 * @returns 2-digit HS code prefix (default: '99')
 */
export async function getHsCodePrefixByCategory(category: string): Promise<string> {
  const mapping = await getCategoryMapping(category);
  return mapping?.hsCodePrefix ?? '99';
}

// ============================================================================
// Scraper Timeout Resolver
// ============================================================================

/**
 * Get scraper request timeout in milliseconds
 * @returns Timeout in ms (default: 30000)
 */
export async function getScraperTimeoutMs(): Promise<number> {
  try {
    const settings = await getAdminSettings();
    return settings.scraperTimeoutMs ?? 30000;
  } catch (error) {
    logger.error('Business', `Failed to get scraper timeout: ${error}`);
    throw new BusinessSettingsError('scraperTimeoutMs', error);
  }
}

// ============================================================================
// Cache TTL Settings Resolvers
// ============================================================================

export interface CacheTTLSettings {
  exchangeRateTtlMin: number;     // 환율 캐시 (분)
  productTtlHours: number;        // 상품 캐시 (시간)
  ratesTtlMin: number;            // 요율표 캐시 (분)
}

/**
 * Get cache TTL settings
 */
export async function getCacheTTLSettings(): Promise<CacheTTLSettings> {
  try {
    const settings = await getAdminSettings();
    return {
      exchangeRateTtlMin: settings.cacheExchangeRateTtlMin ?? 60,
      productTtlHours: settings.cacheProductTtlHours ?? 24,
      ratesTtlMin: settings.cacheRatesTtlMin ?? 5,
    };
  } catch (error) {
    logger.error('Business', `Failed to get cache TTL settings: ${error}`);
    throw new BusinessSettingsError('cacheTTLSettings', error);
  }
}

/**
 * Get exchange rate cache TTL in milliseconds
 */
export async function getExchangeRateCacheTtlMs(): Promise<number> {
  const settings = await getCacheTTLSettings();
  return settings.exchangeRateTtlMin * 60 * 1000;
}

/**
 * Get product cache TTL in milliseconds
 */
export async function getProductCacheTtlMs(): Promise<number> {
  const settings = await getCacheTTLSettings();
  return settings.productTtlHours * 60 * 60 * 1000;
}

/**
 * Get rates cache TTL in milliseconds
 */
export async function getRatesCacheTtlMs(): Promise<number> {
  const settings = await getCacheTTLSettings();
  return settings.ratesTtlMin * 60 * 1000;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Invalidate all rate table caches
 * Call this after updating rates via Admin UI
 */
export { invalidateRatesCache };
