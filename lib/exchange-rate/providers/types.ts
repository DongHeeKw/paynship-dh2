/**
 * PayNShip — Exchange rate provider 공통 인터페이스
 *
 * v2.0 정책: 신한은행 10am 스크래핑 (primary) → 한국수출입은행 API fallback.
 *
 * 모든 provider는 KRW base 환율을 반환:
 *   rates[CCY] = "1 CCY = N KRW" (즉, 매매기준율 vs KRW)
 *
 * Shop currency USD 변환 시 USD↔KRW 페어로 cross-rate 계산.
 */

export type ProviderId = 'SHINHAN_BANK_10AM' | 'KEXIM_FALLBACK' | 'EXCHANGERATE_API';

export interface KrwRateSnapshot {
  /** 항상 'KRW' */
  baseCode: 'KRW';
  /** 환율 수집 시각 (provider 기준) */
  fetchedAt: Date;
  /** rates[CCY] = "1 CCY = N KRW" */
  rates: Record<string, number>;
  /** 사용된 provider */
  provider: ProviderId;
}

export interface KrwRateProvider {
  id: ProviderId;
  /** Presentment currency codes filter (USD/JPY/EUR/...). KRW는 자동 1.0. */
  fetch(filter: string[]): Promise<KrwRateSnapshot>;
}

/**
 * Provider chain 실행: 첫 성공한 결과 반환. 모두 실패 시 마지막 에러 throw.
 */
export async function tryProviders(
  providers: KrwRateProvider[],
  filter: string[],
): Promise<KrwRateSnapshot> {
  const errors: { provider: ProviderId; error: string }[] = [];
  for (const p of providers) {
    try {
      const snapshot = await p.fetch(filter);
      if (Object.keys(snapshot.rates).length === 0) {
        throw new Error('Empty rates');
      }
      return snapshot;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ provider: p.id, error: msg });
    }
  }
  throw new Error(
    `All providers failed: ${errors.map(e => `${e.provider}=${e.error}`).join('; ')}`,
  );
}
