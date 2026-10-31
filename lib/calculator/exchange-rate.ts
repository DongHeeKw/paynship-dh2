/**
 * Exchange Rate Resolver
 *
 * 환율의 단일 소스(Single Source of Truth).
 * Mock/Cache/API/Fallback 패턴을 따름.
 *
 * Resolution Order:
 * 1. Mock Mode (useMockCalculator) → AdminSettings.defaultExchangeRate
 * 2. Valid Cache → cached value
 * 3. External API → fetch and cache
 * 4. Fallback → AdminSettings.defaultExchangeRate
 *
 * @status PARTIAL - API 연동됨, Mock 전환 가능
 * @mockSource AdminSettings.defaultExchangeRate
 * @realSource exchangerate-api.com
 * @caching TTL 1시간
 *
 * @see documents/Reference/SSoT_PATTERN.md
 * @see documents/Reference/CONSTANTS_REGISTRY.md
 */

import logger from '@/lib/utils/logger';
import {
  EXCHANGE_RATE_CACHE_TTL_MS,
  FALLBACK_EXCHANGE_RATE,
} from '@/lib/constants/business';

// ============================================================================
// SSoT - Fallback Value
// ============================================================================

/**
 * 기본 환율 (KRW per USD) - Fallback Value
 *
 * 실제 값은 AdminSettings.defaultExchangeRate에서 가져옴
 * 이 상수는 DB 접근 실패 시 최종 Fallback으로만 사용
 *
 * @deprecated Use getDefaultExchangeRate() from lib/business
 */
export const DEFAULT_EXCHANGE_RATE = FALLBACK_EXCHANGE_RATE;

// ============================================================================
// Cache
// ============================================================================

interface ExchangeRateResponse {
  rate: number;
  timestamp: Date;
  source: 'api' | 'fallback' | 'mock';
}

let cachedRate: ExchangeRateResponse | null = null;

function isCacheValid(): boolean {
  if (!cachedRate) return false;
  return Date.now() - cachedRate.timestamp.getTime() < EXCHANGE_RATE_CACHE_TTL_MS;
}

// ============================================================================
// Mock Mode Check
// ============================================================================

/**
 * Mock 모드 및 DB 설정 체크
 * 순환 참조 방지를 위해 동적 import 사용
 */
interface CalculatorSettings {
  isMockMode: boolean;
  defaultExchangeRate: number;
}

async function getCalculatorSettings(): Promise<CalculatorSettings> {
  // SSoT: AdminSettings (DB 설정만 사용)
  // 동적 import로 순환 참조 방지
  try {
    const { getAdminSettings } = await import('@/lib/admin');
    const settings = await getAdminSettings();
    return {
      isMockMode: settings.useMockCalculator,
      defaultExchangeRate: settings.defaultExchangeRate ?? FALLBACK_EXCHANGE_RATE,
    };
  } catch {
    // DB 실패 시 안전한 기본값 (real calculator 사용)
    return {
      isMockMode: false,
      defaultExchangeRate: FALLBACK_EXCHANGE_RATE,
    };
  }
}

/**
 * Get current KRW to USD exchange rate
 *
 * Resolution Order:
 * 1. Mock Mode (useMockCalculator) → AdminSettings.defaultExchangeRate
 * 2. Valid Cache → cached value
 * 3. External API → fetch and cache
 * 4. Fallback → AdminSettings.defaultExchangeRate
 */
export async function getExchangeRate(): Promise<number> {
  // Get settings from DB (with fallback)
  const settings = await getCalculatorSettings();

  // 1. Mock Mode Check
  if (settings.isMockMode) {
    logger.debug('Exchange', `Mock mode enabled, using rate: ${settings.defaultExchangeRate}`);
    return settings.defaultExchangeRate;
  }

  // 2. Cache Check
  if (isCacheValid()) {
    return cachedRate!.rate;
  }

  // 3. External API
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/KRW', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error('Exchange rate API failed');
    }

    const data = await response.json();
    const rate = 1 / data.rates.USD; // Convert USD->KRW to KRW->USD

    // Update cache
    cachedRate = {
      rate: Math.round(rate * 100) / 100, // Round to 2 decimals
      timestamp: new Date(),
      source: 'api'
    };

    logger.info('Exchange', `Fetched rate from API: ${cachedRate.rate}`);
    return cachedRate.rate;
  } catch (error) {
    // 4. Fallback to DB default
    logger.warn('Exchange', `API failed, using fallback: ${settings.defaultExchangeRate}`);

    cachedRate = {
      rate: settings.defaultExchangeRate,
      timestamp: new Date(),
      source: 'fallback'
    };

    return settings.defaultExchangeRate;
  }
}

/**
 * Get exchange rate synchronously (uses cached value or default)
 *
 * 동기 환경에서 환율이 필요할 때 사용 (UI 렌더링 등)
 * - 캐시가 있으면 캐시된 값 반환
 * - 없으면 DEFAULT_EXCHANGE_RATE 반환
 *
 * @note Mock 모드는 체크하지 않음 (async 필요)
 */
export function getExchangeRateSync(): number {
  if (isCacheValid()) {
    return cachedRate!.rate;
  }
  return DEFAULT_EXCHANGE_RATE;
}

/**
 * Convert KRW to USD
 */
export async function convertKRWtoUSD(krw: number): Promise<number> {
  const rate = await getExchangeRate();
  return krw / rate;
}

/**
 * Get cached exchange rate info (for display purposes)
 * Admin UI에서 현재 환율 소스와 캐시 상태 표시용
 */
export function getCachedRateInfo(): ExchangeRateResponse | null {
  if (isCacheValid()) {
    return cachedRate;
  }
  return null;
}
