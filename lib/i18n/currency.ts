/**
 * Currency Utilities for i18n
 *
 * Provides currency formatting and conversion based on user language.
 *
 * Currency mapping:
 * - en (English) → USD ($)
 * - ko (Korean) → KRW (₩)
 * - zh (Chinese) → CNY (¥)
 */

import type { Language } from './translations';
// SSoT: CurrencyCode from lib/constants/currency.ts
import type { CurrencyCode } from '@/lib/constants/currency';
// SSoT: Exchange rate from lib/constants/business.ts
import { FALLBACK_EXCHANGE_RATE } from '@/lib/constants/business';

// ============================================================================
// Types
// ============================================================================

/**
 * Subset of CurrencyCode for i18n (language-mapped currencies only)
 * SSoT for full list: lib/constants/currency.ts
 */
export type Currency = Extract<CurrencyCode, 'USD' | 'KRW' | 'CNY'>;

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  decimals: number;
  position: 'before' | 'after';
}

// ============================================================================
// Currency Configuration
// ============================================================================

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    position: 'before',
  },
  KRW: {
    code: 'KRW',
    symbol: '₩',
    name: 'Korean Won',
    decimals: 0,
    position: 'before',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    decimals: 2,
    position: 'before',
  },
};

// Language to default currency mapping
export const LANGUAGE_CURRENCY: Record<Language, Currency> = {
  en: 'USD',
  ko: 'KRW',
  zh: 'CNY',
};

// ============================================================================
// Exchange Rates (KRW base)
// These are approximate rates, will be overridden by API in production
// ============================================================================

// Default exchange rates (KRW per 1 unit of foreign currency)
// SSoT for USD rate: lib/constants/business.ts → FALLBACK_EXCHANGE_RATE
export const DEFAULT_EXCHANGE_RATES: Record<Currency, number> = {
  KRW: 1,
  USD: FALLBACK_EXCHANGE_RATE,  // SSoT: lib/constants/business.ts
  CNY: 195,   // 1 CNY = 195 KRW (approximate)
};

// Cached rates with timestamp
let cachedRates: {
  rates: Record<Currency, number>;
  timestamp: number;
} | null = null;

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get current exchange rates (KRW per 1 unit)
 */
export function getExchangeRates(): Record<Currency, number> {
  if (cachedRates && Date.now() - cachedRates.timestamp < CACHE_TTL) {
    return cachedRates.rates;
  }
  return DEFAULT_EXCHANGE_RATES;
}

/**
 * Update cached exchange rates (called from API)
 */
export function updateExchangeRates(rates: Partial<Record<Currency, number>>): void {
  cachedRates = {
    rates: { ...DEFAULT_EXCHANGE_RATES, ...rates },
    timestamp: Date.now(),
  };
}

// ============================================================================
// Currency Conversion
// ============================================================================

/**
 * Convert amount from one currency to another
 *
 * @param amount - Amount to convert
 * @param from - Source currency
 * @param to - Target currency
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;

  const rates = getExchangeRates();

  // Convert to KRW first, then to target currency
  const krwAmount = amount * rates[from];
  const targetAmount = krwAmount / rates[to];

  return targetAmount;
}

/**
 * Convert KRW to user's preferred currency based on language
 */
export function convertFromKRW(
  krwAmount: number,
  language: Language
): number {
  const targetCurrency = LANGUAGE_CURRENCY[language];
  return convertCurrency(krwAmount, 'KRW', targetCurrency);
}

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format price with currency symbol
 *
 * @param amount - Amount in the specified currency
 * @param currency - Currency code
 * @param options - Formatting options
 * @returns Formatted price string
 */
export function formatPrice(
  amount: number,
  currency: Currency,
  options?: {
    showCode?: boolean;  // Show currency code (e.g., "USD")
    compact?: boolean;   // Use compact notation for large numbers
  }
): string {
  const config = CURRENCIES[currency];
  const { showCode = false, compact = false } = options || {};

  // Format the number
  let formatted: string;

  if (compact && Math.abs(amount) >= 10000) {
    // Compact notation for large numbers
    if (Math.abs(amount) >= 1000000) {
      formatted = (amount / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(amount) >= 10000) {
      formatted = (amount / 1000).toFixed(0) + 'K';
    } else {
      formatted = amount.toFixed(config.decimals);
    }
  } else {
    formatted = amount.toLocaleString(undefined, {
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    });
  }

  // Add symbol
  const symbol = config.symbol;
  const result = config.position === 'before'
    ? `${symbol}${formatted}`
    : `${formatted}${symbol}`;

  // Add currency code if requested
  if (showCode) {
    return `${result} ${currency}`;
  }

  return result;
}

/**
 * Format KRW amount in user's preferred currency
 *
 * Convenience function that combines conversion and formatting
 *
 * @param krwAmount - Amount in KRW
 * @param language - User's language (determines currency)
 * @param options - Formatting options
 * @returns Formatted price in user's currency
 */
export function formatPriceForLanguage(
  krwAmount: number,
  language: Language,
  options?: {
    showCode?: boolean;
    compact?: boolean;
    showOriginal?: boolean;  // Also show original KRW price
  }
): string {
  const currency = LANGUAGE_CURRENCY[language];
  const convertedAmount = convertFromKRW(krwAmount, language);
  const formatted = formatPrice(convertedAmount, currency, options);

  if (options?.showOriginal && currency !== 'KRW') {
    const krwFormatted = formatPrice(krwAmount, 'KRW');
    return `${formatted} (${krwFormatted})`;
  }

  return formatted;
}

/**
 * Get currency symbol for a language
 */
export function getCurrencySymbol(language: Language): string {
  const currency = LANGUAGE_CURRENCY[language];
  return CURRENCIES[currency].symbol;
}

/**
 * Get currency code for a language
 */
export function getCurrencyCode(language: Language): Currency {
  return LANGUAGE_CURRENCY[language];
}
