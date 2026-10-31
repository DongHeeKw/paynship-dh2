/**
 * PayNShip — Presentment currency constants (ISO 4217)
 *
 * v2.2 (2026-05-16): v2.0 안 환원 — Presentment 8 통화만 유지.
 *   USD / JPY / EUR / GBP / CAD / AUD / SGD / CNY
 *
 * Shop currency = USD (사용자 결정 2026-05-16).
 * baseCurrency 컬럼은 KRW (한국 소싱 가격 변환 base) — 신한은행 10am 환율.
 *
 * 이전 v2.1 안 (37 currencies + ExchangeRate-API USD base)은 archive.
 */

export interface SupportedCurrencySeed {
  code: string;             // ISO 4217
  displayName: string;
  symbol: string;
  decimals: number;         // JPY = 0, 대부분 = 2
  defaultForCountry: string[]; // ISO 3166-1 alpha-2
  sortOrder: number;        // 낮을수록 먼저 (UI dropdown)
}

/**
 * Presentment 8 통화 (v2.0 안). UI dropdown + Shopify Markets 정렬.
 *
 * 정책: 8개 외 통화 요청 → resolveCurrency()가 USD로 fallback.
 * 신규 통화 추가 시: SHOPIFY_PLAN_MATRIX + Compliance 검토 필수.
 */
export const V21_SUPPORTED_CURRENCIES: SupportedCurrencySeed[] = [
  { code: 'USD', displayName: 'US Dollar',          symbol: '$',   decimals: 2, defaultForCountry: ['US', 'GU'], sortOrder: 1 },
  { code: 'JPY', displayName: 'Japanese Yen',       symbol: '¥',   decimals: 0, defaultForCountry: ['JP'], sortOrder: 2 },
  { code: 'EUR', displayName: 'Euro',               symbol: '€',   decimals: 2, defaultForCountry: ['DE','FR','IT','ES','NL','BE','AT','IE','PT','LU','FI','GR','LT','EE','HR','LV','SI','SK','MT','CY'], sortOrder: 3 },
  { code: 'GBP', displayName: 'British Pound',      symbol: '£',   decimals: 2, defaultForCountry: ['GB'], sortOrder: 4 },
  { code: 'CAD', displayName: 'Canadian Dollar',    symbol: 'C$',  decimals: 2, defaultForCountry: ['CA'], sortOrder: 5 },
  { code: 'AUD', displayName: 'Australian Dollar',  symbol: 'A$',  decimals: 2, defaultForCountry: ['AU'], sortOrder: 6 },
  { code: 'SGD', displayName: 'Singapore Dollar',   symbol: 'S$',  decimals: 2, defaultForCountry: ['SG'], sortOrder: 7 },
  { code: 'CNY', displayName: 'Chinese Yuan',       symbol: '¥',   decimals: 2, defaultForCountry: ['CN'], sortOrder: 8 },
];

/**
 * Country → Currency 매핑 (Shopify Markets 기반)
 */
export const COUNTRY_TO_CURRENCY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const cur of V21_SUPPORTED_CURRENCIES) {
    for (const country of cur.defaultForCountry) {
      map[country] = cur.code;
    }
  }
  return map;
})();

export const V21_CURRENCY_CODES = V21_SUPPORTED_CURRENCIES.map(c => c.code).sort();

export function isSupportedCurrency(code: string): boolean {
  return V21_CURRENCY_CODES.includes(code);
}

export function getCurrencyConfig(code: string): SupportedCurrencySeed | undefined {
  return V21_SUPPORTED_CURRENCIES.find(c => c.code === code);
}

/**
 * Fallback 규칙:
 * 1. 지원 통화 (Presentment 8) → 그대로
 * 2. 비지원 → USD (shop currency)
 */
export function resolveCurrency(code: string | null | undefined): string {
  if (code && isSupportedCurrency(code)) return code;
  return 'USD';
}
