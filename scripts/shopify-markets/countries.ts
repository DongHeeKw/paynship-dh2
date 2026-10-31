/**
 * PayNShip v2.1 — Shopify Markets 설정 스크립트용 국가 데이터
 *
 * 런타임(client/server) 공용 데이터는 `lib/shipping/countries.ts` 참조.
 * 이 파일은 스크립트 전용: Markets 전략, presentment currency 리스트 포함.
 */

import { COUNTRIES, ISO_CODES } from '../../lib/shipping/countries';

export { COUNTRIES, ISO_CODES };
export type { CountryEntry } from '../../lib/shipping/countries';

/**
 * Shopify Markets 구성 전략 (Basic 플랜 3 market 한도)
 */
export const MARKET_STRATEGY = {
  primary: { name: '대한민국', handle: 'kr', regions: ['KR'] },
  international: {
    name: 'International',
    handle: 'international',
    regions: ISO_CODES,
    presentmentCurrencies: [
      'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'HKD', 'TWD',
      'AUD', 'NZD', 'CAD', 'SGD', 'CHF', 'SEK', 'NOK', 'DKK',
      'THB', 'MYR', 'IDR', 'PHP', 'VND', 'INR',
      'AED', 'SAR', 'KWD', 'TRY', 'ZAR',
      'MXN', 'BRL', 'ARS', 'CLP',
      'PLN', 'CZK', 'HUF', 'RUB',
    ],
  },
};

if (require.main === module) {
  console.log(`Total countries: ${COUNTRIES.length}`);
  console.log('Regions:');
  for (const region of ['APAC', 'EUROPE', 'AMERICAS', 'MEA'] as const) {
    const list = COUNTRIES.filter(c => c.region === region);
    console.log(`  ${region} (${list.length}): ${list.map(c => c.iso).join(', ')}`);
  }
}
