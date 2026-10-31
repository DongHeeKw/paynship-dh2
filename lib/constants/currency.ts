/**
 * Currency Constants and Utilities (SSoT)
 *
 * 통화별 정밀도 및 포맷팅 규칙 정의
 *
 * @module lib/constants/currency
 * @see documents/Reference/CONSTANTS_REGISTRY.md
 */

// ============================================================================
// Currency Definitions
// ============================================================================

export type CurrencyCode = 'KRW' | 'USD' | 'CNY' | 'JPY' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;        // 소수점 자릿수 (0 = 정수)
  symbolPosition: 'prefix' | 'suffix';
}

/**
 * 통화별 설정 (SSoT)
 *
 * decimals: 해당 통화의 최소 단위 기준
 * - 0: 최소 단위가 1 (KRW, JPY)
 * - 2: 최소 단위가 0.01 (USD, CNY, EUR, GBP)
 */
export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  KRW: {
    code: 'KRW',
    symbol: '₩',
    name: 'Korean Won',
    decimals: 0,
    symbolPosition: 'prefix',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimals: 0,
    symbolPosition: 'prefix',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    symbolPosition: 'prefix',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    symbolPosition: 'prefix',
  },
};

// ============================================================================
// Precision Utilities
// ============================================================================

/**
 * 통화에 맞게 금액을 반올림
 *
 * @example
 * roundCurrency(29990.456, 'KRW')  // 29990
 * roundCurrency(29.994, 'USD')     // 29.99
 * roundCurrency(29.996, 'USD')     // 30.00
 */
export function roundCurrency(amount: number, currency: CurrencyCode): number {
  const config = CURRENCIES[currency];
  const factor = Math.pow(10, config.decimals);
  return Math.round(amount * factor) / factor;
}

/**
 * 통화 포맷팅 (표시용)
 *
 * @example
 * formatCurrency(29990, 'KRW')     // "₩29,990"
 * formatCurrency(29.99, 'USD')     // "$29.99"
 * formatCurrency(199.50, 'CNY')    // "¥199.50"
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const config = CURRENCIES[currency];
  const rounded = roundCurrency(amount, currency);

  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  return config.symbolPosition === 'prefix'
    ? `${config.symbol}${formatted}`
    : `${formatted}${config.symbol}`;
}

/**
 * KRW 전용 반올림 (편의 함수)
 * DB 저장 전 호출하여 정수 보장
 */
export function roundKRW(amount: number): number {
  return Math.round(amount);
}

/**
 * USD 전용 반올림 (편의 함수)
 * 소수점 2자리까지
 */
export function roundUSD(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * CNY 전용 반올림 (편의 함수)
 * 소수점 2자리까지 (USD와 동일)
 */
export function roundCNY(amount: number): number {
  return Math.round(amount * 100) / 100;
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * 금액이 해당 통화 정밀도에 맞는지 검증
 *
 * @example
 * isValidPrecision(29990, 'KRW')     // true
 * isValidPrecision(29990.5, 'KRW')   // false (KRW는 정수만)
 * isValidPrecision(29.99, 'USD')     // true
 * isValidPrecision(29.999, 'USD')    // false (3자리 소수)
 */
export function isValidPrecision(amount: number, currency: CurrencyCode): boolean {
  const config = CURRENCIES[currency];
  const factor = Math.pow(10, config.decimals);
  const scaled = amount * factor;
  return Number.isInteger(scaled);
}

/**
 * 금액을 안전하게 정규화 (저장 전 사용)
 * - 검증 + 반올림
 * - 음수는 0으로 처리
 */
export function normalizeCurrency(amount: number, currency: CurrencyCode): number {
  if (amount < 0) return 0;
  return roundCurrency(amount, currency);
}
