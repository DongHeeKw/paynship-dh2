/**
 * Main Price Calculator
 * Orchestrates all pricing components to generate final quote
 */

import { getExchangeRate } from './exchange-rate';
import {
  calculateShippingWithDetailsAsync,
  estimateWeight,
  estimateDimensions,
  PackageDimensions,
} from './shipping';
import {
  calculateCustomsDutyAsync,
  calculateSalesTaxAsync,
  estimateHSCode,
  getTaxRateAsync,
} from './customs';
import { getMockPriceBreakdown, checkMockCalculatorMode } from './mocks';
import { getCategoryEstimates, getServiceFeeRate } from '@/lib/business';
import logger from '@/lib/utils/logger';
import type { QuoteQualityGate } from './quality-types';

export interface PriceBreakdown {
  // Input
  itemPriceKRW: number;
  weightKg: number;
  hsCode: string;
  countryCode: string;

  // Calculated values
  exchangeRate: number;
  itemPriceUSD: number;
  shippingCost: number;
  domesticShippingUsd?: number;
  subtotal: number; // Item + Shipping
  customsDuty: number;
  salesTax: number;
  serviceFee: number;
  totalUSD: number;

  // Metadata
  estimatedDays: string;
  calculations: {
    serviceFeeRate: number; // 0.10 for 10%
    dutyRate: number;
    taxRate: number;
  };
  customsDetails?: {
    ftaApplied: boolean;
    ftaName?: string;
    mfnRate: number;
    appliedRate: number;
    ftaSavings?: number;
  };
  qualityGate?: QuoteQualityGate;
  assuranceTrail?: string[];

  // Volumetric weight details (new)
  weightDetails?: {
    actualWeight: number;
    volumetricWeight: number;
    billableWeight: number;
    chargedBy: 'actual' | 'volumetric';
    dimensions?: PackageDimensions;
    isEstimated: boolean; // true if weight/dimensions were estimated
  };
}

export interface CalculatePriceOptions {
  itemPriceKRW: number;
  mode?: 'strict' | 'degraded';
  weightKg?: number; // Optional - will estimate if not provided
  dimensions?: { l: number; w: number; h: number }; // Optional - for volumetric weight
  hsCode?: string; // Optional - will estimate based on category
  origin?: string; // Optional - enables FTA lookup when available
  category?: string; // Product category for estimation
  countryCode: string;
}

/**
 * Calculate complete price breakdown with all fees
 */
export async function calculatePrice(
  options: CalculatePriceOptions
): Promise<PriceBreakdown> {
  // Check for mock mode first (AdminSettings + env)
  if (await checkMockCalculatorMode()) {
    logger.debug('[Calculator] Mock mode enabled, using simplified calculations');
    return getMockPriceBreakdown(options);
  }

  const {
    itemPriceKRW,
    mode = 'degraded',
    weightKg: providedWeight,
    dimensions: providedDimensions,
    hsCode: providedHSCode,
    origin,
    category,
    countryCode,
  } = options;

  // Get exchange rate and service fee rate from SSoT
  const [exchangeRate, serviceFeeRate, categoryEstimates] = await Promise.all([
    getExchangeRate(),
    getServiceFeeRate(),
    getCategoryEstimates(category),
  ]);

  // Convert item price to USD
  const itemPriceUSD = itemPriceKRW / exchangeRate;

  if (
    mode === 'strict'
    && (
      typeof providedWeight !== 'number'
      || !providedDimensions
      || !providedHSCode
      || !origin
    )
  ) {
    throw new Error('Strict quote calculation requires verified weight, dimensions, hsCode, and origin');
  }

  // Estimate weight if not provided
  const hasProvidedWeight = typeof providedWeight === 'number' && providedWeight > 0;
  const weightKg = hasProvidedWeight
    ? providedWeight
    : categoryEstimates.weightKg || estimateWeight(category);
  const isWeightEstimated = !hasProvidedWeight;

  // Convert dimensions format and estimate if not provided
  let packageDimensions: PackageDimensions | undefined;
  let isDimensionsEstimated = false;

  if (providedDimensions && providedDimensions.l > 0 && providedDimensions.w > 0 && providedDimensions.h > 0) {
    packageDimensions = {
      length: providedDimensions.l,
      width: providedDimensions.w,
      height: providedDimensions.h,
    };
  } else {
    const estimatedDimensions = categoryEstimates.dimensions || (() => {
      const fallback = estimateDimensions(category);
      return { l: fallback.length, w: fallback.width, h: fallback.height };
    })();
    packageDimensions = {
      length: estimatedDimensions.l,
      width: estimatedDimensions.w,
      height: estimatedDimensions.h,
    };
    isDimensionsEstimated = true;
  }

  // Estimate HS code if not provided
  const hsCode = providedHSCode || estimateHSCode(category);

  // Calculate shipping, customs, and tax from async SSoT-backed resolvers
  const [shippingResult, dutyResult, taxInfo] = await Promise.all([
    calculateShippingWithDetailsAsync(weightKg, countryCode, packageDimensions),
    calculateCustomsDutyAsync(itemPriceUSD, hsCode, countryCode, origin, true),
    getTaxRateAsync(countryCode),
  ]);
  const shippingCost = shippingResult.cost;

  // Subtotal (item + shipping)
  const subtotal = itemPriceUSD + shippingCost;

  // Service fee (from SSoT: lib/business/settings.ts → AdminSettings.serviceFeeRate)
  const serviceFee = subtotal * serviceFeeRate;

  // Calculate customs duty (on item value only)
  const customsDuty = dutyResult.duty;

  // Calculate sales tax (on subtotal + duty + service fee)
  const taxableAmount = subtotal + customsDuty + serviceFee;
  const salesTax = await calculateSalesTaxAsync(taxableAmount, countryCode);

  // Final total
  const totalUSD = subtotal + customsDuty + salesTax + serviceFee;

  // Round all values to 2 decimals
  return {
    itemPriceKRW: Math.round(itemPriceKRW * 100) / 100,
    weightKg: Math.round(shippingResult.weightDetails.billableWeight * 100) / 100,
    hsCode,
    countryCode,
    exchangeRate: Math.round(exchangeRate * 100) / 100,
    itemPriceUSD: Math.round(itemPriceUSD * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    customsDuty: Math.round(customsDuty * 100) / 100,
    salesTax: Math.round(salesTax * 100) / 100,
    serviceFee: Math.round(serviceFee * 100) / 100,
    totalUSD: Math.round(totalUSD * 100) / 100,
    estimatedDays: shippingResult.rate.estimatedDays,
    calculations: {
      serviceFeeRate,
      dutyRate: dutyResult.appliedRate,
      taxRate: taxInfo.salesTaxRate,
    },
    customsDetails: {
      ftaApplied: dutyResult.ftaApplied,
      ftaName: dutyResult.ftaName,
      mfnRate: dutyResult.mfnRate,
      appliedRate: dutyResult.appliedRate,
      ftaSavings: dutyResult.ftaSavings,
    },
    // Volumetric weight details
    weightDetails: {
      actualWeight: shippingResult.weightDetails.actualWeight,
      volumetricWeight: shippingResult.weightDetails.volumetricWeight,
      billableWeight: shippingResult.weightDetails.billableWeight,
      chargedBy: shippingResult.weightDetails.chargedBy,
      dimensions: packageDimensions,
      isEstimated: isWeightEstimated || isDimensionsEstimated,
    },
  };
}

/**
 * Format price breakdown as human-readable text
 */
export function formatPriceBreakdown(breakdown: PriceBreakdown): string {
  // Build weight details string
  let weightInfo = `${breakdown.weightKg}kg`;

  if (breakdown.weightDetails) {
    const wd = breakdown.weightDetails;
    if (wd.volumetricWeight > 0 && wd.chargedBy === 'volumetric') {
      weightInfo = `${wd.billableWeight}kg (volumetric: ${wd.dimensions?.length}×${wd.dimensions?.width}×${wd.dimensions?.height}cm)`;
    } else if (wd.volumetricWeight > 0) {
      weightInfo = `${wd.actualWeight}kg actual, ${wd.volumetricWeight}kg volumetric`;
    }
    if (wd.isEstimated) {
      weightInfo += ' (estimated)';
    }
  }

  return `
Price Breakdown:
━━━━━━━━━━━━━━━━━━━━━
Item Price: ${breakdown.itemPriceKRW.toLocaleString()} KRW
Exchange Rate: ${breakdown.exchangeRate} KRW/USD
Item Price (USD): $${breakdown.itemPriceUSD.toFixed(2)}

Shipping (${weightInfo}): $${breakdown.shippingCost.toFixed(2)}
Subtotal: $${breakdown.subtotal.toFixed(2)}

Customs Duty: $${breakdown.customsDuty.toFixed(2)}
Sales Tax: $${breakdown.salesTax.toFixed(2)}
Service Fee (10%): $${breakdown.serviceFee.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━
TOTAL: $${breakdown.totalUSD.toFixed(2)} USD
Estimated Delivery: ${breakdown.estimatedDays} days
  `.trim();
}
