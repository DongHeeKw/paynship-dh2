/**
 * PayNShip — 신한은행 환율 provider (v2.0 primary)
 *
 * 정책: 매일 10:00 KST 고시환율 스크래핑 → KRW base rates 반환.
 * 봇 차단 / HTML 구조 변경 위험 → KEXIM API fallback 필수.
 *
 * 환경변수:
 *   SHINHAN_EXCHANGE_URL  — 환율 페이지 URL (운영자가 설정)
 *   SHINHAN_SCRAPE_TOKEN  — (옵션) bot 우회용 토큰 또는 user-agent override
 *
 * SHINHAN_EXCHANGE_URL 미설정 시 fetch()는 즉시 에러 → tryProviders가 KEXIM으로 fallback.
 */

import { KrwRateProvider, KrwRateSnapshot } from './types';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** ISO code → 신한 환율 페이지에서 사용하는 통화명 패턴 (KRW pair) */
const SHINHAN_CURRENCY_PATTERN: Record<string, RegExp[]> = {
  USD: [/미국\s*USD/, /USD/],
  JPY: [/일본\s*JPY/, /JPY\s*\(100\)?/], // 100엔당
  EUR: [/유로\s*EUR/, /EUR/],
  GBP: [/영국\s*GBP/, /GBP/],
  CAD: [/캐나다\s*CAD/, /CAD/],
  AUD: [/호주\s*AUD/, /AUD/],
  SGD: [/싱가포르\s*SGD/, /SGD/],
  CNY: [/위안화\s*CNH?|중국\s*CN[YH]/, /CNH?/],
};

const JPY_PER_100 = new Set(['JPY']); // JPY는 100엔당 환율로 고시

export interface ShinhanFetchOptions {
  url?: string;
  userAgent?: string;
  /** 테스트용 — HTML 직접 주입 */
  htmlOverride?: string;
}

/**
 * 신한 환율 페이지 HTML에서 통화별 매매기준율을 파싱.
 *
 * 페이지 구조는 자주 바뀌므로 정규식 기반 보수적 파싱:
 *   1. 통화 패턴 매칭 위치 탐색
 *   2. 이후 100자 이내 첫 숫자 (1,234.56 형식) 추출
 */
export function parseShinhanHtml(html: string, filter: string[]): Record<string, number> {
  const rates: Record<string, number> = {};

  for (const code of filter) {
    if (code === 'KRW') {
      rates.KRW = 1;
      continue;
    }
    const patterns = SHINHAN_CURRENCY_PATTERN[code];
    if (!patterns) continue;

    for (const pat of patterns) {
      const m = html.match(pat);
      if (!m || m.index == null) continue;

      // 매칭 위치 직후 ~ 300자 안의 첫 숫자 (e.g. "1,350.50")
      const tail = html.slice(m.index, m.index + 300);
      const numMatch = tail.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+\.[0-9]+)/);
      if (!numMatch) continue;

      const raw = numMatch[1].replace(/,/g, '');
      const value = parseFloat(raw);
      if (!Number.isFinite(value) || value <= 0) continue;

      // JPY는 100엔당 → 1엔당으로 정규화
      rates[code] = JPY_PER_100.has(code) ? value / 100 : value;
      break;
    }
  }

  return rates;
}

export async function fetchShinhanRates(
  filter: string[],
  opts: ShinhanFetchOptions = {},
): Promise<KrwRateSnapshot> {
  const url = opts.url ?? process.env.SHINHAN_EXCHANGE_URL;
  if (!url && !opts.htmlOverride) {
    throw new Error('SHINHAN_EXCHANGE_URL not configured');
  }

  let html: string;
  if (opts.htmlOverride) {
    html = opts.htmlOverride;
  } else {
    const res = await fetch(url!, {
      headers: {
        'User-Agent': opts.userAgent ?? DEFAULT_USER_AGENT,
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      throw new Error(`Shinhan HTTP ${res.status}`);
    }
    html = await res.text();
  }

  const rates = parseShinhanHtml(html, filter);
  if (Object.keys(rates).length === 0) {
    throw new Error('Shinhan parse returned no rates');
  }

  return {
    baseCode: 'KRW',
    fetchedAt: new Date(),
    rates,
    provider: 'SHINHAN_BANK_10AM',
  };
}

export const shinhanProvider: KrwRateProvider = {
  id: 'SHINHAN_BANK_10AM',
  fetch: (filter) => fetchShinhanRates(filter),
};
