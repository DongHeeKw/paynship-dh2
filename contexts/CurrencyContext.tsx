'use client';

/**
 * PayNShip v2.1 — CurrencyContext
 *
 * 역할:
 *  - 현재 고객의 preferred currency (cookie-based persistence)
 *  - USD 기준 환율 map (memory cache + SWR-like refetch)
 *  - `convert(usd) → { amount, rate }` helper
 *
 * 의도적으로 Zustand 안 씀. 기존 kbuyer-v2 컨벤션 (React Context) 유지.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  V21_CURRENCY_CODES,
  getCurrencyConfig,
  resolveCurrency,
  type SupportedCurrencySeed,
} from '@/lib/exchange-rate/constants';

const COOKIE_KEY = 'paynship:v2:currency';
const COOKIE_TTL_DAYS = 365;
const REFETCH_INTERVAL_MS = 60 * 60 * 1000; // 1h

export type UsdRatesMap = Record<string, number>;

export interface CurrencyContextValue {
  /** 현재 선택된 통화 (ISO 4217) */
  selected: string;
  /** 지원 통화 목록 (UI dropdown) */
  supported: SupportedCurrencySeed[];
  /** USD 기준 환율 (1 USD = rates[X]) */
  rates: UsdRatesMap;
  /** 환율 fetch 시각 (ISO string) */
  ratesFetchedAt: string | null;
  /** 로딩/에러 상태 */
  isLoading: boolean;
  error: string | null;

  /** 통화 변경 (쿠키 저장) */
  setCurrency: (code: string) => void;
  /** USD → current currency 환산 */
  convert: (usd: number) => { amount: number; rate: number; fallback: boolean };
  /** 강제 환율 재조회 */
  refresh: () => Promise<void>;
}

const defaultValue: CurrencyContextValue = {
  selected: 'USD',
  supported: [],
  rates: { USD: 1 },
  ratesFetchedAt: null,
  isLoading: false,
  error: null,
  setCurrency: () => {},
  convert: (usd: number) => ({ amount: usd, rate: 1, fallback: true }),
  refresh: async () => {},
};

const CurrencyContext = createContext<CurrencyContextValue>(defaultValue);

export function CurrencyProvider({
  children,
  /** SSR에서 cookie로 감지한 초기 통화 (middleware에서 주입) */
  initialCurrency = 'USD',
  /** SSR에서 주입 가능한 초기 환율 (선택) */
  initialRates = { USD: 1 },
  /** 지원 통화 목록 (보통 mount 시 고정) */
  supported = V21_CURRENCY_CODES.map(code => getCurrencyConfig(code)!).filter(Boolean),
}: {
  children: React.ReactNode;
  initialCurrency?: string;
  initialRates?: UsdRatesMap;
  supported?: SupportedCurrencySeed[];
}) {
  const [selected, setSelectedState] = useState<string>(() => resolveCurrency(initialCurrency));
  const [rates, setRates] = useState<UsdRatesMap>(initialRates);
  const [ratesFetchedAt, setRatesFetchedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refetchTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/exchange-rate', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { rates: UsdRatesMap; fetchedAt: string | null };
      setRates(body.rates || { USD: 1 });
      setRatesFetchedAt(body.fetchedAt ?? null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 fetch + 1시간마다 refetch
  useEffect(() => {
    void refresh();
    refetchTimer.current = setInterval(() => void refresh(), REFETCH_INTERVAL_MS);
    return () => {
      if (refetchTimer.current) clearInterval(refetchTimer.current);
    };
  }, [refresh]);

  const setCurrency = useCallback((code: string) => {
    const resolved = resolveCurrency(code);
    setSelectedState(resolved);
    // cookie 저장 (client-side only)
    if (typeof document !== 'undefined') {
      const expires = new Date();
      expires.setDate(expires.getDate() + COOKIE_TTL_DAYS);
      document.cookie = `${COOKIE_KEY}=${resolved}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    }
  }, []);

  const convert = useCallback(
    (usd: number): { amount: number; rate: number; fallback: boolean } => {
      if (selected === 'USD') return { amount: usd, rate: 1, fallback: false };
      const rate = rates[selected];
      if (rate == null || !Number.isFinite(rate)) {
        return { amount: usd, rate: 1, fallback: true };
      }
      return { amount: usd * rate, rate, fallback: false };
    },
    [selected, rates],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      selected,
      supported,
      rates,
      ratesFetchedAt,
      isLoading,
      error,
      setCurrency,
      convert,
      refresh,
    }),
    [selected, supported, rates, ratesFetchedAt, isLoading, error, setCurrency, convert, refresh],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
