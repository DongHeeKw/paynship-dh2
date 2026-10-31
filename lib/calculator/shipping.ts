/**
 * International Shipping Rate Calculator
 * Based on destination country and package weight (actual or volumetric)
 *
 * Volumetric Weight: Carriers charge based on whichever is greater:
 * - Actual weight (kg)
 * - Volumetric weight = (L × W × H) / DIM factor
 *
 * DIM factors by carrier:
 * - DHL/FedEx/UPS: 5000 (cm³/kg) for international
 * - K-Packet/EMS: 6000 (cm³/kg) - from AdminSettings.dimFactor (SSoT)
 *
 * SSoT: Shipping rates are stored in DB (ShippingRate table)
 * Resolvers: lib/business/settings.ts
 */

// Import directly from settings (not barrel) to avoid circular dependency:
// shipping.ts → @/lib/business (barrel) → category-resolver.ts → shipping.ts
import { getDimFactorSync, getShippingRateByCountry, getShippingRates as getShippingRatesFromDb } from '@/lib/business/settings';
import type { ShippingRate as DbShippingRate } from '@prisma/client';

export interface ShippingRate {
  country: string;
  countryCode: string;
  ratePerKg: number; // USD per kg
  baseRate: number; // Minimum shipping cost
  estimatedDays: string;
}

export interface PackageDimensions {
  length: number;  // cm
  width: number;   // cm
  height: number;  // cm
}

export interface BillableWeightResult {
  actualWeight: number;      // kg
  volumetricWeight: number;  // kg (0 if no dimensions)
  billableWeight: number;    // max(actual, volumetric)
  chargedBy: 'actual' | 'volumetric';
}

// Fallback shipping rates (used when DB is unavailable)
// These are ONLY used as a last resort fallback
const FALLBACK_SHIPPING_RATES: ShippingRate[] = [
  { country: 'United States', countryCode: 'US', ratePerKg: 15, baseRate: 12, estimatedDays: '7-14' },
  { country: 'Other', countryCode: 'XX', ratePerKg: 20, baseRate: 15, estimatedDays: '14-21' },
];

/**
 * Convert DB ShippingRate to local ShippingRate interface
 */
function toShippingRate(dbRate: DbShippingRate): ShippingRate {
  return {
    country: dbRate.countryName,
    countryCode: dbRate.countryCode,
    ratePerKg: dbRate.ratePerKg,
    baseRate: dbRate.baseRate,
    estimatedDays: dbRate.estimatedDays,
  };
}

/**
 * Get shipping rate for a specific country (async - from DB)
 * @param countryCode ISO country code
 * @returns ShippingRate from DB
 */
export async function getShippingRateAsync(countryCode: string): Promise<ShippingRate> {
  const dbRate = await getShippingRateByCountry(countryCode);
  return toShippingRate(dbRate);
}

/**
 * Get shipping rate for a specific country (sync fallback)
 * @deprecated Use getShippingRateAsync for production code
 */
export function getShippingRate(countryCode: string): ShippingRate {
  const rate = FALLBACK_SHIPPING_RATES.find(r => r.countryCode === countryCode);
  return rate || FALLBACK_SHIPPING_RATES[FALLBACK_SHIPPING_RATES.length - 1];
}

// DIM factor from SSoT: lib/business/settings.ts → AdminSettings.dimFactor
// K-Packet/EMS: 6000 (more favorable than DHL/FedEx: 5000)
// Note: Using sync version as this is a pure calculation function

/**
 * Calculate volumetric weight from package dimensions
 * Formula: (L × W × H) / DIM_FACTOR
 *
 * @param dimensions - Package dimensions in cm
 * @returns Volumetric weight in kg
 */
export function calculateVolumetricWeight(dimensions: PackageDimensions): number {
  const { length, width, height } = dimensions;
  const volumeCm3 = length * width * height;
  const dimFactor = getDimFactorSync();
  const volumetricWeight = volumeCm3 / dimFactor;
  return Math.round(volumetricWeight * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate billable weight (max of actual vs volumetric)
 * Carriers charge based on whichever is greater
 *
 * @param actualWeightKg - Actual product weight in kg
 * @param dimensions - Optional package dimensions in cm
 * @returns BillableWeightResult with details
 */
export function calculateBillableWeight(
  actualWeightKg: number,
  dimensions?: PackageDimensions
): BillableWeightResult {
  const actualWeight = Math.round(actualWeightKg * 100) / 100;

  if (!dimensions || dimensions.length <= 0 || dimensions.width <= 0 || dimensions.height <= 0) {
    return {
      actualWeight,
      volumetricWeight: 0,
      billableWeight: actualWeight,
      chargedBy: 'actual',
    };
  }

  const volumetricWeight = calculateVolumetricWeight(dimensions);
  const billableWeight = Math.max(actualWeight, volumetricWeight);

  return {
    actualWeight,
    volumetricWeight,
    billableWeight,
    chargedBy: billableWeight === actualWeight ? 'actual' : 'volumetric',
  };
}

/**
 * Calculate shipping cost based on weight and destination
 * Uses billable weight (max of actual vs volumetric) if dimensions provided
 */
export function calculateShippingCost(
  weightKg: number,
  countryCode: string,
  dimensions?: PackageDimensions
): number {
  const rate = getShippingRate(countryCode);

  // Calculate billable weight
  const { billableWeight } = calculateBillableWeight(weightKg, dimensions);

  const cost = Math.max(rate.baseRate, billableWeight * rate.ratePerKg);
  return Math.round(cost * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate shipping cost with detailed breakdown
 * Returns both cost and weight analysis
 */
export function calculateShippingWithDetails(
  weightKg: number,
  countryCode: string,
  dimensions?: PackageDimensions
): {
  cost: number;
  weightDetails: BillableWeightResult;
  rate: ShippingRate;
} {
  const rate = getShippingRate(countryCode);
  const weightDetails = calculateBillableWeight(weightKg, dimensions);
  const cost = Math.max(rate.baseRate, weightDetails.billableWeight * rate.ratePerKg);

  return {
    cost: Math.round(cost * 100) / 100,
    weightDetails,
    rate,
  };
}

/**
 * Calculate shipping cost (async - from DB)
 */
export async function calculateShippingCostAsync(
  weightKg: number,
  countryCode: string,
  dimensions?: PackageDimensions
): Promise<number> {
  const rate = await getShippingRateAsync(countryCode);
  const { billableWeight } = calculateBillableWeight(weightKg, dimensions);
  const cost = Math.max(rate.baseRate, billableWeight * rate.ratePerKg);
  return Math.round(cost * 100) / 100;
}

/**
 * Calculate shipping with detailed breakdown (async - from DB)
 */
export async function calculateShippingWithDetailsAsync(
  weightKg: number,
  countryCode: string,
  dimensions?: PackageDimensions
): Promise<{
  cost: number;
  weightDetails: BillableWeightResult;
  rate: ShippingRate;
}> {
  const rate = await getShippingRateAsync(countryCode);
  const weightDetails = calculateBillableWeight(weightKg, dimensions);
  const cost = Math.max(rate.baseRate, weightDetails.billableWeight * rate.ratePerKg);

  return {
    cost: Math.round(cost * 100) / 100,
    weightDetails,
    rate,
  };
}

/**
 * Get all available shipping destinations (async - from DB)
 */
export async function getAvailableCountriesAsync(): Promise<ShippingRate[]> {
  const dbRates = await getShippingRatesFromDb();
  return dbRates
    .filter(r => r.countryCode !== 'XX')
    .map(toShippingRate);
}

/**
 * Get all available shipping destinations (sync fallback)
 * @deprecated Use getAvailableCountriesAsync for production code
 */
export function getAvailableCountries(): ShippingRate[] {
  return FALLBACK_SHIPPING_RATES.filter(r => r.countryCode !== 'XX');
}

/**
 * Estimate package weight based on product category
 * Returns weight in kg
 */
/**
 * SSoT: Category-based weight estimation map (kg)
 * Other modules should import this instead of defining their own.
 */
export const CATEGORY_WEIGHT_MAP: Record<string, number> = {
  'fashion': 0.5,
  'beauty': 0.3,
  'cosmetics': 0.3,
  'electronics': 1.0,
  'food': 0.8,
  'snack': 0.5,       // Lighter than general food
  'books': 0.5,
  'book': 0.5,        // Alias for books
  'toys': 0.7,
  'home': 1.5,
  'k-pop': 0.4,       // Albums, merchandise
  'music': 0.4,
  'cd': 0.4,          // CD/Album products
  'album': 0.4,       // Music albums
  'jewelry': 0.1,
  'accessories': 0.2,
  'shoes': 1.2,
  'bags': 0.8,
  'health': 0.5,
  'cloth': 0.5,       // Clothing alias
  'default': 1.0,
};

export function estimateWeight(category?: string): number {
  const weights = CATEGORY_WEIGHT_MAP;

  const normalizedCategory = category?.toLowerCase() || 'default';

  // Check for partial matches (e.g., "K-pop Album" matches "k-pop")
  for (const [key, value] of Object.entries(weights)) {
    if (normalizedCategory.includes(key)) {
      return value;
    }
  }

  return weights.default;
}

/**
 * Estimate package dimensions based on product category
 * Returns dimensions in cm (length, width, height)
 *
 * These are typical packaging sizes for each category,
 * including padding and box material
 */
export function estimateDimensions(category?: string): PackageDimensions {
  // Typical package dimensions by category (cm)
  // Format: { length, width, height }
  const dimensions: Record<string, PackageDimensions> = {
    'fashion': { length: 35, width: 25, height: 8 },    // Folded clothing
    'beauty': { length: 20, width: 15, height: 10 },    // Skincare set
    'cosmetics': { length: 20, width: 15, height: 10 },
    'electronics': { length: 30, width: 25, height: 15 }, // With packaging
    'food': { length: 25, width: 20, height: 15 },
    'books': { length: 25, width: 18, height: 5 },
    'toys': { length: 30, width: 25, height: 20 },
    'home': { length: 40, width: 30, height: 20 },
    'k-pop': { length: 32, width: 26, height: 5 },      // Album box set
    'music': { length: 32, width: 26, height: 5 },
    'jewelry': { length: 15, width: 10, height: 5 },    // Small jewelry box
    'accessories': { length: 20, width: 15, height: 8 },
    'shoes': { length: 35, width: 25, height: 15 },     // Shoe box
    'bags': { length: 40, width: 35, height: 15 },      // Handbag box
    'health': { length: 20, width: 15, height: 10 },
    'default': { length: 30, width: 25, height: 15 },
  };

  const normalizedCategory = category?.toLowerCase() || 'default';

  // Check for partial matches
  for (const [key, value] of Object.entries(dimensions)) {
    if (normalizedCategory.includes(key)) {
      return value;
    }
  }

  return dimensions.default;
}
