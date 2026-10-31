/**
 * PayNShip — Exchange Rate Service (v2.2)
 *
 * v2.0 정책: 신한은행 10am 스크래핑 (primary) → KEXIM API fallback.
 * baseCurrency = KRW (한국 소싱 가격 변환 base). Shop currency USD는 cross-rate로 계산.
 *
 * 저장 전략 (Prisma `ExchangeRate`):
 *   - KRW base rows: { baseCurrency: "KRW", currencyCode: CCY, effectiveRate: krwPerCcy }
 *   - USD base rows (cross-rate, display 호환성): { baseCurrency: "USD", currencyCode: CCY, effectiveRate: ccyPerUsd }
 *
 * 이 듀얼 저장은 (a) v2.0 원칙 (KRW base) 와 (b) 기존 클라이언트 (USD base 가정) 양립 가능하게 함.
 * Phase 2 후속: Order/Quote 가격 저장도 KRW 소스 → USD shop 으로 명시화.
 */

import { prisma } from '@/lib/db/prisma';
import { V21_CURRENCY_CODES } from './constants';
import { tryProviders, ProviderId, KrwRateSnapshot } from './providers/types';
import { shinhanProvider } from './providers/shinhan';
import { keximProvider } from './providers/kexim';

export const KRW_BASE = 'KRW';
export const USD_BASE = 'USD';
/** v1.1 schema 호환 — 신한은행 primary source code */
export const PRIMARY_SOURCE: ProviderId = 'SHINHAN_BANK_10AM';
/** 환율 row TTL: 25시간 (daily cron + 1h 여유) */
export const RATE_TTL_MS = 25 * 60 * 60 * 1000;

/** 레거시 호환 alias — Currency Context / API route 에서 사용 중 */
export const V21_BASE = USD_BASE;
export const V21_SOURCE = PRIMARY_SOURCE;
export const V21_TTL_MS = RATE_TTL_MS;

export interface UsdRatesMap {
  [currencyCode: string]: number;
}

/**
 * Provider chain — 신한 (primary) → KEXIM (fallback).
 * ExchangeRate-API 의존 제거 (v2.0 안).
 */
const DEFAULT_PROVIDERS = [shinhanProvider, keximProvider];

/**
 * 최신 유효 USD 환율 조회 (expiresAt > now).
 * USD base cross-rate row 우선, 미존재 시 KRW base에서 즉시 계산하여 반환.
 */
export async function getLatestUsdRates(): Promise<UsdRatesMap> {
  const now = new Date();
  const rows = await prisma.exchangeRate.findMany({
    where: {
      baseCurrency: USD_BASE,
      expiresAt: { gt: now },
      currencyCode: { in: V21_CURRENCY_CODES },
    },
    orderBy: { capturedAt: 'desc' },
  });

  const seen = new Set<string>();
  const result: UsdRatesMap = {};
  for (const r of rows) {
    if (seen.has(r.currencyCode)) continue;
    seen.add(r.currencyCode);
    result[r.currencyCode] = r.effectiveRate;
  }
  if (!result.USD) result.USD = 1;

  // 누락 통화는 KRW base 에서 cross-rate 계산
  const missing = V21_CURRENCY_CODES.filter(c => !(c in result));
  if (missing.length > 0) {
    const krwSnapshot = await loadLatestKrwRates();
    if (krwSnapshot && krwSnapshot.USD) {
      for (const code of missing) {
        if (krwSnapshot[code]) {
          result[code] = krwSnapshot[code] / krwSnapshot.USD;
        }
      }
    }
  }

  return result;
}

/**
 * KRW base 최신 환율 (캐시된 row 들). 내부 cross-rate 계산용.
 * 반환: { USD: 1350, JPY: 9, EUR: 1450, ... }
 */
async function loadLatestKrwRates(): Promise<UsdRatesMap | null> {
  const now = new Date();
  const rows = await prisma.exchangeRate.findMany({
    where: {
      baseCurrency: KRW_BASE,
      expiresAt: { gt: now },
      currencyCode: { in: V21_CURRENCY_CODES },
    },
    orderBy: { capturedAt: 'desc' },
  });
  if (rows.length === 0) return null;

  const seen = new Set<string>();
  const result: UsdRatesMap = { KRW: 1 };
  for (const r of rows) {
    if (seen.has(r.currencyCode)) continue;
    seen.add(r.currencyCode);
    result[r.currencyCode] = r.effectiveRate;
  }
  return result;
}

export interface RefreshResult {
  fetchedAt: Date;
  saved: number;
  provider: ProviderId;
  snapshot: KrwRateSnapshot;
}

/**
 * 환율 전체 refresh: provider chain → KRW base + USD cross-rate 듀얼 저장.
 *
 * 1. tryProviders([Shinhan, KEXIM]) 으로 KRW base snapshot 획득
 * 2. KRW base rows insert (currencyCode = USD/JPY/EUR/...)
 * 3. USD cross-rate 계산 (USD↔KRW 페어 기준) → USD base rows insert
 */
export async function refreshUsdRates(): Promise<RefreshResult> {
  const snapshot = await tryProviders(DEFAULT_PROVIDERS, V21_CURRENCY_CODES);
  const expiresAt = new Date(snapshot.fetchedAt.getTime() + RATE_TTL_MS);
  const usdPerKrw = snapshot.rates.USD;
  if (!usdPerKrw || usdPerKrw <= 0) {
    throw new Error(`USD/KRW rate missing in provider ${snapshot.provider}`);
  }

  // 1. KRW base rows
  const krwInserts = Object.entries(snapshot.rates)
    .filter(([code]) => code !== 'KRW')
    .map(([code, krwPerCcy]) => ({
      currencyCode: code,
      baseCurrency: KRW_BASE,
      shinhanRate: krwPerCcy,
      adminAdjustment: 0,
      effectiveRate: krwPerCcy,
      capturedAt: snapshot.fetchedAt,
      expiresAt,
      source: snapshot.provider,
    }));

  // 2. USD cross-rate rows
  // ccyPerUsd = (KRW per CCY)⁻¹ × (KRW per USD)
  //           = krwPerUsd / krwPerCcy
  const usdInserts = Object.entries(snapshot.rates)
    .filter(([code]) => code !== 'USD')
    .map(([code, krwPerCcy]) => {
      const ccyPerUsd = code === 'KRW' ? usdPerKrw : usdPerKrw / krwPerCcy;
      return {
        currencyCode: code,
        baseCurrency: USD_BASE,
        shinhanRate: ccyPerUsd,
        adminAdjustment: 0,
        effectiveRate: ccyPerUsd,
        capturedAt: snapshot.fetchedAt,
        expiresAt,
        source: snapshot.provider,
      };
    });

  const inserts = [...krwInserts, ...usdInserts];
  const created = await prisma.exchangeRate.createMany({
    data: inserts,
    skipDuplicates: false,
  });

  return {
    fetchedAt: snapshot.fetchedAt,
    saved: created.count,
    provider: snapshot.provider,
    snapshot,
  };
}

/**
 * USD 금액을 target currency로 환산 (표시용).
 * 환율 DB에 없으면 usdAmount 그대로 반환 (fallback).
 */
export function convertFromUsd(
  usdAmount: number,
  targetCurrency: string,
  rates: UsdRatesMap,
): { amount: number; rate: number; usedFallback: boolean } {
  const rate = rates[targetCurrency];
  if (rate == null || !Number.isFinite(rate)) {
    return { amount: usdAmount, rate: 1, usedFallback: true };
  }
  return { amount: usdAmount * rate, rate, usedFallback: false };
}
