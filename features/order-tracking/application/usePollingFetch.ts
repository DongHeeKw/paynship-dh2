'use client';

/**
 * PayNShip v2.1 — 폴링 Fetch Hook
 *
 * 30초마다 URL을 재조회. 탭이 hidden이면 일시 정지 (네트워크/배터리 절약).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UsePollingFetchOptions<T> {
  url: string;
  /** 폴링 간격 (ms). 기본 30000 */
  intervalMs?: number;
  /** 초기 데이터 (SSR 전달 시) */
  initialData?: T;
  /** 시작 여부 (auth 대기 등) */
  enabled?: boolean;
}

export interface UsePollingFetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** 수동 즉시 재조회 */
  refetch: () => Promise<void>;
  /** 마지막 성공 시각 */
  lastFetchedAt: Date | null;
}

export function usePollingFetch<T>({
  url,
  intervalMs = 30_000,
  initialData,
  enabled = true,
}: UsePollingFetchOptions<T>): UsePollingFetchResult<T> {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(initialData ? new Date() : null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOnce = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as T;
      setData(body);
      setLastFetchedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) return;

    // 초기 1회
    void fetchOnce();

    // 폴링 시작
    function startTimer() {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        void fetchOnce();
      }, intervalMs);
    }
    startTimer();

    // 탭 visibility change — 돌아오면 즉시 refetch
    function onVisibilityChange() {
      if (typeof document !== 'undefined' && !document.hidden) {
        void fetchOnce();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, fetchOnce, intervalMs]);

  return { data, error, loading, refetch: fetchOnce, lastFetchedAt };
}
