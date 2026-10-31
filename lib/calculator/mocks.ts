/**
 * Mock Price Calculator
 * Simplified calculations for MVP development
 *
 * Mock 모드 제어:
 * SSoT: AdminSettings.useMockCalculator (DB 설정만 사용)
 */

import type { PriceBreakdown, CalculatePriceOptions } from './price';
import { DEFAULT_EXCHANGE_RATE } from './exchange-rate';
import { getServiceFeeRateSync } from '@/lib/business';
import { prisma } from '@/lib/db/prisma';
import { getAdminSettings } from '@/lib/admin/cache';

// Simplified shipping rates (3 regions)
const SHIPPING_REGIONS: Record<string, { base: number; perKg: number; days: string }> = {
  // Asia
  JP: { base: 10, perKg: 8, days: '3-5' },
  SG: { base: 12, perKg: 10, days: '5-7' },
  TH: { base: 14, perKg: 11, days: '7-10' },
  VN: { base: 14, perKg: 11, days: '7-10' },
  CN: { base: 12, perKg: 9, days: '5-7' },
  TW: { base: 11, perKg: 9, days: '4-6' },
  HK: { base: 11, perKg: 9, days: '4-6' },

  // Americas
  US: { base: 15, perKg: 12, days: '7-14' },
  CA: { base: 16, perKg: 13, days: '10-14' },
  MX: { base: 18, perKg: 15, days: '14-21' },
  BR: { base: 20, perKg: 18, days: '14-21' },

  // Europe
  GB: { base: 18, perKg: 14, days: '7-14' },
  DE: { base: 18, perKg: 14, days: '10-14' },
  FR: { base: 18, perKg: 14, days: '10-14' },
  IT: { base: 19, perKg: 15, days: '10-14' },
  ES: { base: 19, perKg: 15, days: '10-14' },
  NL: { base: 18, perKg: 14, days: '10-14' },

  // Oceania
  AU: { base: 16, perKg: 13, days: '10-14' },
  NZ: { base: 18, perKg: 15, days: '10-14' },
};

// Default for unknown countries
const DEFAULT_SHIPPING = { base: 20, perKg: 15, days: '14-21' };

// Simplified duty rates (5 categories)
const DUTY_RATES: Record<string, number> = {
  'fashion': 0.12,      // Clothing/Fashion: 12%
  'electronics': 0,     // Electronics: 0% (duty-free)
  'cosmetics': 0,       // Cosmetics: 0% (duty-free)
  'k-pop': 0,           // K-pop/Albums: 0% (duty-free)
  'food': 0.05,         // Food: 5%
  'other': 0.05,        // Default: 5%
};

// Tax rates by country
const TAX_RATES: Record<string, { rate: number; threshold: number }> = {
  US: { rate: 0.08, threshold: 800 },    // $800 de minimis
  GB: { rate: 0.20, threshold: 135 },    // £135 ≈ $170
  CA: { rate: 0.13, threshold: 20 },     // $20 CAD ≈ $15 USD
  DE: { rate: 0.19, threshold: 150 },    // €150 ≈ $165
  FR: { rate: 0.20, threshold: 150 },
  JP: { rate: 0.10, threshold: 130 },    // ¥16,666 ≈ $130
  SG: { rate: 0.09, threshold: 400 },
  AU: { rate: 0.10, threshold: 1000 },
  CN: { rate: 0.13, threshold: 50 },
};

const DEFAULT_TAX = { rate: 0.10, threshold: 100 };

/**
 * Check if mock calculator is enabled (sync version)
 * @deprecated Use checkMockCalculatorMode() which reads from AdminSettings
 */
export function isMockCalculatorEnabled(): boolean {
  // 동기 함수에서는 DB 조회 불가 → 항상 false 반환
  console.warn('[Deprecated] isMockCalculatorEnabled() called - use checkMockCalculatorMode() instead');
  return false;
}

/**
 * Check if mock calculator is enabled
 * SSoT: AdminSettings.useMockCalculator (DB 설정만 사용)
 */
export async function checkMockCalculatorMode(): Promise<boolean> {
  try {
    const settings = await getAdminSettings();
    return settings.useMockCalculator ?? false;
  } catch (error) {
    // DB 실패 시 안전한 기본값 (real calculator 사용)
    console.warn('[Calculator] Mock mode check failed, using real calculator:', error);
    return false;
  }
}

/**
 * Calculate mock price breakdown
 */
export function getMockPriceBreakdown(options: CalculatePriceOptions): PriceBreakdown {
  const { itemPriceKRW, weightKg = 0.5, category = 'other', countryCode } = options;

  // Exchange rate (fixed)
  const exchangeRate = DEFAULT_EXCHANGE_RATE;
  const itemPriceUSD = itemPriceKRW / exchangeRate;

  // Shipping
  const shippingInfo = SHIPPING_REGIONS[countryCode] || DEFAULT_SHIPPING;
  const shippingCost = Math.max(shippingInfo.base, weightKg * shippingInfo.perKg);

  // Subtotal
  const subtotal = itemPriceUSD + shippingCost;

  // Service fee (from SSoT: lib/business - Sync version for mock)
  const serviceFeeRate = getServiceFeeRateSync();
  const serviceFee = subtotal * serviceFeeRate;

  // Duty
  const categoryLower = category.toLowerCase();
  const dutyRate = DUTY_RATES[categoryLower] || DUTY_RATES['other'];
  let customsDuty = itemPriceUSD * dutyRate;

  // Tax
  const taxInfo = TAX_RATES[countryCode] || DEFAULT_TAX;

  // Check de minimis threshold
  if (itemPriceUSD < taxInfo.threshold) {
    customsDuty = 0; // No duty below threshold
  }

  const taxableAmount = subtotal + customsDuty + serviceFee;
  const salesTax = taxableAmount * taxInfo.rate;

  // Total
  const totalUSD = subtotal + customsDuty + salesTax + serviceFee;

  // Round to 2 decimal places
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    itemPriceKRW: round(itemPriceKRW),
    weightKg: round(weightKg),
    hsCode: '9999.99', // Mock HS code
    countryCode,
    exchangeRate,
    itemPriceUSD: round(itemPriceUSD),
    shippingCost: round(shippingCost),
    subtotal: round(subtotal),
    customsDuty: round(customsDuty),
    salesTax: round(salesTax),
    serviceFee: round(serviceFee),
    totalUSD: round(totalUSD),
    estimatedDays: shippingInfo.days,
    calculations: {
      serviceFeeRate,
      dutyRate: customsDuty > 0 ? dutyRate : 0,
      taxRate: taxInfo.rate,
    },
  };
}

/**
 * Get estimated delivery days for a country
 */
export function getMockDeliveryEstimate(countryCode: string): string {
  const shippingInfo = SHIPPING_REGIONS[countryCode] || DEFAULT_SHIPPING;
  return shippingInfo.days;
}
