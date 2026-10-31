/**
 * PayNShip — 한국수출입은행 (KEXIM) 환율 provider (v2.0 fallback)
 *
 * API: https://www.koreaexim.go.kr/site/program/financial/exchangeJSON
 *   ?authkey={KEY}&searchdate=YYYYMMDD&data=AP01
 *
 * 응답 예시 (배열):
 *   [{ cur_unit: "USD", deal_bas_r: "1,350.50", ... }, ...]
 *
 *   cur_unit:    통화 코드 (JPY는 "JPY(100)" — 100엔당)
 *   deal_bas_r:  매매기준율 (KRW 기준)
 *
 * 영업일 단위 (주말/공휴일은 직전 영업일 데이터). 11:00 KST 이후 당일 데이터 갱신.
 * 11:00 이전 호출 → 어제 데이터 반환. 토/일/공휴일은 데이터 없음 → 직전 영업일 검색 필요.
 */

import { KrwRateProvider, KrwRateSnapshot } from './types';

export interface KeximRateRow {
  cur_unit: string;       // "USD", "JPY(100)", "CNH" 등
  deal_bas_r: string;     // "1,350.50"
  ttb?: string;
  tts?: string;
  cur_nm?: string;
}

/** KEXIM cur_unit → ISO code 정규화 */
function normalizeKeximCode(cur: string): { code: string; per100: boolean } {
  const upper = cur.trim().toUpperCase();
  if (upper === 'JPY(100)') return { code: 'JPY', per100: true };
  if (upper === 'CNH') return { code: 'CNY', per100: false }; // CNH 역외위안화 → CNY로 통합
  return { code: upper, per100: false };
}

function parseDealRate(raw: string): number {
  const cleaned = raw.replace(/,/g, '').trim();
  const v = parseFloat(cleaned);
  return Number.isFinite(v) && v > 0 ? v : NaN;
}

export interface KeximFetchOptions {
  authKey?: string;
  /** YYYYMMDD. 미지정 시 오늘 KST. */
  searchDate?: string;
  /** 테스트용 — 응답 배열 직접 주입 */
  rowsOverride?: KeximRateRow[];
}

function todayKstYmd(): string {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/** 직전 영업일까지 최대 7일 거슬러 fetch 시도 */
const MAX_LOOKBACK_DAYS = 7;

export async function fetchKeximRates(
  filter: string[],
  opts: KeximFetchOptions = {},
): Promise<KrwRateSnapshot> {
  if (opts.rowsOverride) {
    return buildSnapshotFromRows(opts.rowsOverride, filter, new Date());
  }

  const authKey = opts.authKey ?? process.env.KEXIM_API_KEY;
  if (!authKey) {
    throw new Error('KEXIM_API_KEY not configured');
  }

  const startYmd = opts.searchDate ?? todayKstYmd();
  let lastError = '';

  for (let lookback = 0; lookback < MAX_LOOKBACK_DAYS; lookback++) {
    const ymd = shiftYmd(startYmd, -lookback);
    const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${encodeURIComponent(authKey)}&searchdate=${ymd}&data=AP01`;

    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PayNShip/2.2' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const text = await res.text();
      // KEXIM은 인증 오류도 200으로 반환 — body 검증 필요
      let rows: KeximRateRow[];
      try {
        rows = JSON.parse(text);
      } catch {
        lastError = `Invalid JSON: ${text.slice(0, 100)}`;
        continue;
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        lastError = `Empty array (${ymd} 휴장일 또는 인증 오류)`;
        continue;
      }
      return buildSnapshotFromRows(rows, filter, parseYmdToDate(ymd));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`KEXIM failed after ${MAX_LOOKBACK_DAYS}d lookback: ${lastError}`);
}

function buildSnapshotFromRows(
  rows: KeximRateRow[],
  filter: string[],
  fetchedAt: Date,
): KrwRateSnapshot {
  const filterSet = new Set(filter);
  const rates: Record<string, number> = {};
  if (filterSet.has('KRW')) rates.KRW = 1;

  for (const row of rows) {
    if (!row.cur_unit || !row.deal_bas_r) continue;
    const { code, per100 } = normalizeKeximCode(row.cur_unit);
    if (!filterSet.has(code)) continue;

    const dealRate = parseDealRate(row.deal_bas_r);
    if (!Number.isFinite(dealRate)) continue;

    rates[code] = per100 ? dealRate / 100 : dealRate;
  }

  return {
    baseCode: 'KRW',
    fetchedAt,
    rates,
    provider: 'KEXIM_FALLBACK',
  };
}

function shiftYmd(ymd: string, deltaDays: number): string {
  const y = parseInt(ymd.slice(0, 4), 10);
  const m = parseInt(ymd.slice(4, 6), 10) - 1;
  const d = parseInt(ymd.slice(6, 8), 10);
  const dt = new Date(Date.UTC(y, m, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function parseYmdToDate(ymd: string): Date {
  const y = parseInt(ymd.slice(0, 4), 10);
  const m = parseInt(ymd.slice(4, 6), 10) - 1;
  const d = parseInt(ymd.slice(6, 8), 10);
  // KEXIM 데이터 기준 시각: 11:00 KST = 02:00 UTC
  return new Date(Date.UTC(y, m, d, 2, 0, 0));
}

export const keximProvider: KrwRateProvider = {
  id: 'KEXIM_FALLBACK',
  fetch: (filter) => fetchKeximRates(filter),
};
