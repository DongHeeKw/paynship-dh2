/**
 * Currency Conversion Utilities
 *
 * 환율 변환의 단일 소스(Single Source of Truth).
 * KRW ↔ USD 변환 시 반드시 이 모듈의 함수를 사용할 것.
 *
 * @see lib/calculator/exchange-rate.ts - 환율 조회
 */

import { getExchangeRateSync, getExchangeRate } from './exchange-rate';

/**
 * KRW를 USD로 변환 (동기)
 * 캐시된 환율 또는 기본값 사용
 *
 * @example
 * const usd = krwToUsdSync(25000); // → 17.86 (at rate 1400)
 */
export function krwToUsdSync(krw: number, exchangeRate?: number): number {
  const rate = exchangeRate ?? getExchangeRateSync();
  return roundTo2Decimals(krw / rate);
}

/**
 * KRW를 USD로 변환 (비동기)
 * API/DB에서 최신 환율 조회
 *
 * @example
 * const usd = await krwToUsd(25000);
 */
export async function krwToUsd(krw: number): Promise<number> {
  const rate = await getExchangeRate();
  return roundTo2Decimals(krw / rate);
}

/**
 * USD를 KRW로 변환 (동기)
 */
export function usdToKrwSync(usd: number, exchangeRate?: number): number {
  const rate = exchangeRate ?? getExchangeRateSync();
  return Math.round(usd * rate);
}

/**
 * USD를 KRW로 변환 (비동기)
 */
export async function usdToKrw(usd: number): Promise<number> {
  const rate = await getExchangeRate();
  return Math.round(usd * rate);
}

/**
 * 2자리 소수점으로 반올림
 * 모든 USD 금액에 사용
 */
export function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 카트 아이템 가격 계산 (옵션 가격 조정 포함)
 */
export interface CartItemPrice {
  priceKrw: number;
  optionPriceAdjustment?: number;
  quantity: number;
}

export function calculateItemTotalKrw(item: CartItemPrice): number {
  return (item.priceKrw + (item.optionPriceAdjustment || 0)) * item.quantity;
}

export function calculateItemTotalUsd(item: CartItemPrice, exchangeRate?: number): number {
  const totalKrw = calculateItemTotalKrw(item);
  return krwToUsdSync(totalKrw, exchangeRate);
}

/**
 * 카트 전체 합계 계산
 */
export interface CartSubtotals {
  subtotalKrw: number;
  subtotalUsd: number;
  itemCount: number;
}

export function calculateCartSubtotals(
  items: CartItemPrice[],
  exchangeRate?: number
): CartSubtotals {
  const subtotalKrw = items.reduce((sum, item) => sum + calculateItemTotalKrw(item), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotalKrw,
    subtotalUsd: krwToUsdSync(subtotalKrw, exchangeRate),
    itemCount,
  };
}
