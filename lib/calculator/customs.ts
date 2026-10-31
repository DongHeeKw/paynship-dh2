/**
 * Customs Duty and Tax Calculator
 * Based on HS codes and destination country regulations
 *
 * SSoT: Duty and tax rates are stored in DB (HsCodeRate, CountryTaxRate tables)
 * Resolvers: lib/business/settings.ts
 *
 * ## FTA Integration (2025-01)
 * - `calculateCustomsDutyAsync` now accepts optional `origin` parameter
 * - When origin is provided, FTA preferential rates are applied (KORUS, RCEP, etc.)
 * - FTA lookup: lib/classifier/origin-fta-lookup.ts
 */

import { getHsCodeRate, getCountryTaxRate, getHsCodeRates as getHsCodeRatesFromDb } from '@/lib/business';
import { getFTARate } from '@/lib/classifier/origin-fta-lookup';
import type { HsCodeRate as DbHsCodeRate, CountryTaxRate as DbCountryTaxRate } from '@prisma/client';

export interface CustomsRate {
  hsCode: string;
  description: string;
  dutyRate: number; // As decimal (e.g., 0.05 for 5%)
}

export interface CountryTaxRate {
  countryCode: string;
  countryName: string;
  salesTaxRate: number; // VAT/GST/Sales Tax rate
  taxName: string; // e.g., "VAT", "GST", "Sales Tax"
  dutyThreshold: number; // Minimum value before duty applies (USD)
  taxThreshold: number; // Minimum value before tax applies (USD)
}

/**
 * Customs calculation result with FTA information
 */
export interface CustomsDutyResult {
  /** Calculated duty amount in USD */
  duty: number;
  /** Whether FTA was applied */
  ftaApplied: boolean;
  /** FTA name if applicable */
  ftaName?: string;
  /** MFN (Most Favored Nation) rate without FTA */
  mfnRate: number;
  /** Actual rate applied (may be FTA preferential rate) */
  appliedRate: number;
  /** Savings due to FTA (in USD) */
  ftaSavings?: number;
}

// Fallback rates (used when DB is unavailable)
const FALLBACK_HS_CODE_RATES: CustomsRate[] = [
  { hsCode: '00', description: 'General merchandise', dutyRate: 0.05 },
];

const FALLBACK_COUNTRY_TAX_RATES: CountryTaxRate[] = [
  {
    countryCode: 'XX',
    countryName: 'Other',
    salesTaxRate: 0.10,
    taxName: 'Tax',
    dutyThreshold: 100,
    taxThreshold: 100,
  },
];

/**
 * Convert DB HsCodeRate to local CustomsRate interface
 */
function toCustomsRate(dbRate: DbHsCodeRate): CustomsRate {
  return {
    hsCode: dbRate.hsCode,
    description: dbRate.description,
    dutyRate: dbRate.dutyRate,
  };
}

/**
 * Convert DB CountryTaxRate to local CountryTaxRate interface
 */
function toCountryTaxRate(dbRate: DbCountryTaxRate): CountryTaxRate {
  return {
    countryCode: dbRate.countryCode,
    countryName: dbRate.countryName,
    salesTaxRate: dbRate.salesTaxRate,
    taxName: dbRate.taxName,
    dutyThreshold: dbRate.dutyThreshold,
    taxThreshold: dbRate.taxThreshold,
  };
}

/**
 * Get customs duty rate for a product based on HS code (async - from DB)
 * Tries exact match, then prefix matches (4-digit, 2-digit), then default
 */
export async function getDutyRateAsync(hsCode: string): Promise<CustomsRate> {
  const dbRate = await getHsCodeRate(hsCode);
  return toCustomsRate(dbRate);
}

/**
 * Get customs duty rate for a product based on HS code (sync fallback)
 * @deprecated Use getDutyRateAsync for production code
 */
export function getDutyRate(hsCode: string): CustomsRate {
  return FALLBACK_HS_CODE_RATES[0];
}

/**
 * Get tax rate for a specific country (async - from DB)
 */
export async function getTaxRateAsync(countryCode: string): Promise<CountryTaxRate> {
  const dbRate = await getCountryTaxRate(countryCode);
  return toCountryTaxRate(dbRate);
}

/**
 * Get tax rate for a specific country (sync fallback)
 * @deprecated Use getTaxRateAsync for production code
 */
export function getTaxRate(countryCode: string): CountryTaxRate {
  return FALLBACK_COUNTRY_TAX_RATES[0];
}

/**
 * Calculate customs duty (async - from DB)
 *
 * @param itemValueUSD - Item value in USD
 * @param hsCode - HS code (6-10 digits)
 * @param countryCode - Destination country code
 * @param origin - Optional origin country (for FTA lookup)
 * @returns Duty amount in USD, or full CustomsDutyResult if origin provided
 */
export async function calculateCustomsDutyAsync(
  itemValueUSD: number,
  hsCode: string,
  countryCode: string,
  origin?: string
): Promise<number>;
export async function calculateCustomsDutyAsync(
  itemValueUSD: number,
  hsCode: string,
  countryCode: string,
  origin: string | undefined,
  returnDetails: true
): Promise<CustomsDutyResult>;
export async function calculateCustomsDutyAsync(
  itemValueUSD: number,
  hsCode: string,
  countryCode: string,
  origin?: string,
  returnDetails?: boolean
): Promise<number | CustomsDutyResult> {
  const taxInfo = await getTaxRateAsync(countryCode);

  // Check if below threshold
  if (itemValueUSD < taxInfo.dutyThreshold) {
    if (returnDetails) {
      return {
        duty: 0,
        ftaApplied: false,
        mfnRate: 0,
        appliedRate: 0,
      };
    }
    return 0;
  }

  const dutyInfo = await getDutyRateAsync(hsCode);
  let appliedRate = dutyInfo.dutyRate;
  let ftaApplied = false;
  let ftaName: string | undefined;
  let ftaSavings: number | undefined;

  // Apply FTA rate if origin is provided
  if (origin) {
    const ftaResult = await getFTARate(origin, countryCode, hsCode);

    if (ftaResult.ftaApplicable && ftaResult.preferentialRate !== null) {
      // Convert percentage to decimal (FTA returns percentage like 13.0 for 13%)
      const ftaRateDecimal = ftaResult.preferentialRate / 100;
      const mfnRateDecimal = ftaResult.mfnRate / 100;

      // Use FTA rate if it's lower than standard rate
      if (ftaRateDecimal < dutyInfo.dutyRate) {
        const mfnDuty = itemValueUSD * dutyInfo.dutyRate;
        const ftaDuty = itemValueUSD * ftaRateDecimal;

        appliedRate = ftaRateDecimal;
        ftaApplied = true;
        ftaName = ftaResult.ftaName || undefined;
        ftaSavings = Math.round((mfnDuty - ftaDuty) * 100) / 100;
      }
    }
  }

  const duty = Math.round(itemValueUSD * appliedRate * 100) / 100;

  if (returnDetails) {
    return {
      duty,
      ftaApplied,
      ftaName,
      mfnRate: dutyInfo.dutyRate,
      appliedRate,
      ftaSavings,
    };
  }

  return duty;
}

/**
 * Calculate customs duty (sync fallback)
 * @deprecated Use calculateCustomsDutyAsync for production code
 */
export function calculateCustomsDuty(
  itemValueUSD: number,
  hsCode: string,
  countryCode: string
): number {
  const taxInfo = getTaxRate(countryCode);

  if (itemValueUSD < taxInfo.dutyThreshold) {
    return 0;
  }

  const dutyInfo = getDutyRate(hsCode);
  const duty = itemValueUSD * dutyInfo.dutyRate;

  return Math.round(duty * 100) / 100;
}

/**
 * Calculate sales tax/VAT (async - from DB)
 */
export async function calculateSalesTaxAsync(
  taxableAmount: number,
  countryCode: string
): Promise<number> {
  const taxInfo = await getTaxRateAsync(countryCode);

  if (taxableAmount < taxInfo.taxThreshold) {
    return 0;
  }

  const tax = taxableAmount * taxInfo.salesTaxRate;
  return Math.round(tax * 100) / 100;
}

/**
 * Calculate sales tax/VAT (sync fallback)
 * @deprecated Use calculateSalesTaxAsync for production code
 */
export function calculateSalesTax(
  taxableAmount: number,
  countryCode: string
): number {
  const taxInfo = getTaxRate(countryCode);

  if (taxableAmount < taxInfo.taxThreshold) {
    return 0;
  }

  const tax = taxableAmount * taxInfo.salesTaxRate;
  return Math.round(tax * 100) / 100;
}

/**
 * Get all HS code categories (async - from DB)
 */
export async function getHSCodeCategoriesAsync(): Promise<CustomsRate[]> {
  const dbRates = await getHsCodeRatesFromDb();
  return dbRates
    .filter(r => r.hsCode !== '00')
    .map(toCustomsRate);
}

/**
 * Get all HS code categories (sync fallback)
 * @deprecated Use getHSCodeCategoriesAsync for production code
 */
export function getHSCodeCategories(): CustomsRate[] {
  return [];
}

/**
 * Estimate HS code based on product category
 */
export function estimateHSCode(category?: string): string {
  const categoryMap: Record<string, string> = {
    'fashion': '62',
    'clothing': '62',
    'shoes': '64',
    'beauty': '33',
    'cosmetics': '33',
    'electronics': '85',
    'food': '19',
    'snacks': '19',
    'books': '49',
    'album': '49',
    'toys': '95',
    'home': '63',
    'default': '00',
  };

  return categoryMap[category?.toLowerCase() || 'default'] || '00';
}
