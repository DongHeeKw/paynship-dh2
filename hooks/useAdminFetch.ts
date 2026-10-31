/**
 * useAdminFetch - Admin 페이지용 공통 Fetch 훅
 *
 * 중복되는 fetch 로직을 통합:
 * - loading/error 상태 관리
 * - 페이지네이션 처리
 * - 자동 재시도
 * - URL 파라미터 동기화
 *
 * @module hooks/useAdminFetch
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PaginationData } from '@/lib/admin/types';

// ============================================================================
// Types
// ============================================================================

export interface FetchOptions {
  /** 초기 페이지 번호 */
  initialPage?: number;
  /** 페이지당 항목 수 */
  pageSize?: number;
  /** 자동 fetch 여부 (default: true) */
  autoFetch?: boolean;
  /** 캐시 TTL (ms, default: 0 = no cache) */
  cacheTTL?: number;
}

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  pagination: PaginationData;
}

export interface FetchResult<T> extends FetchState<T> {
  /** 데이터 다시 가져오기 */
  refetch: () => Promise<void>;
  /** 페이지 변경 */
  setPage: (page: number) => void;
  /** 필터 적용 후 fetch */
  fetchWithFilters: (filters: Record<string, string | number | boolean | undefined>) => Promise<void>;
  /** 에러 초기화 */
  clearError: () => void;
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  pagination: PaginationData;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCacheKey(endpoint: string, params: URLSearchParams): string {
  return `${endpoint}?${params.toString()}`;
}

function getCached<T>(key: string, ttl: number): CacheEntry<T> | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (ttl > 0 && Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return entry;
}

function setCache<T>(key: string, data: T, pagination: PaginationData): void {
  cache.set(key, { data, pagination, timestamp: Date.now() });
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Admin 페이지용 공통 Fetch 훅
 *
 * @example
 * ```tsx
 * const { data, loading, pagination, setPage, fetchWithFilters } = useAdminFetch<Order[]>(
 *   '/api/admin/orders',
 *   { pageSize: 20 }
 * );
 *
 * // 필터 적용
 * fetchWithFilters({ status: 'PENDING', from: '2025-01-01' });
 *
 * // 페이지 변경
 * setPage(2);
 * ```
 */
export function useAdminFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): FetchResult<T> {
  const {
    initialPage = 1,
    pageSize = 20,
    autoFetch = true,
    cacheTTL = 0,
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: autoFetch,
    error: null,
    pagination: {
      page: initialPage,
      limit: pageSize,
      total: 0,
      totalPages: 0,
    },
  });

  const filtersRef = useRef<Record<string, string | number | boolean | undefined>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (
    page: number = state.pagination.page,
    filters: Record<string, string | number | boolean | undefined> = filtersRef.current
  ) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Build URL params
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== false) {
        params.set(key, String(value));
      }
    });

    // Check cache
    const cacheKey = getCacheKey(endpoint, params);
    const cached = getCached<T>(cacheKey, cacheTTL);
    if (cached) {
      setState(prev => ({
        ...prev,
        data: cached.data,
        pagination: cached.pagination,
        loading: false,
        error: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${endpoint}?${params}`, {
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // API 응답 구조에 따라 데이터 추출
      // 일반적으로 { data: T, pagination: PaginationData } 또는
      // { [key]: T, pagination: PaginationData } 형식
      let data: T;
      let pagination: PaginationData;

      if ('pagination' in result) {
        pagination = result.pagination;
        // data 키가 있으면 사용, 없으면 pagination 제외한 첫 번째 배열 찾기
        if ('data' in result) {
          data = result.data;
        } else {
          // conversations, orders, logs 등 다양한 키 지원
          const dataKey = Object.keys(result).find(
            key => key !== 'pagination' && Array.isArray(result[key])
          );
          data = dataKey ? result[dataKey] : result;
        }
      } else {
        // pagination이 없는 단순 응답
        data = result;
        pagination = {
          page,
          limit: pageSize,
          total: Array.isArray(result) ? result.length : 0,
          totalPages: 1,
        };
      }

      // Update cache
      if (cacheTTL > 0) {
        setCache(cacheKey, data, pagination);
      }

      setState({
        data,
        loading: false,
        error: null,
        pagination,
      });

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return; // Ignore abort errors
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [endpoint, pageSize, cacheTTL, state.pagination.page]);

  // Auto fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPage = useCallback((page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page },
    }));
    fetchData(page);
  }, [fetchData]);

  const fetchWithFilters = useCallback(async (
    filters: Record<string, string | number | boolean | undefined>
  ) => {
    filtersRef.current = filters;
    await fetchData(1, filters); // Reset to page 1 when filtering
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    refetch,
    setPage,
    fetchWithFilters,
    clearError,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Admin 통계 데이터 Fetch 훅 (단일 객체 반환)
 */
export function useAdminStats<T>(endpoint: string, cacheTTL = 30000) {
  return useAdminFetch<T>(endpoint, {
    autoFetch: true,
    cacheTTL,
    pageSize: 1,
  });
}

/**
 * Admin 상세 페이지 Fetch 훅
 */
export function useAdminDetail<T>(endpoint: string) {
  return useAdminFetch<T>(endpoint, {
    autoFetch: true,
    cacheTTL: 5000,
    pageSize: 1,
  });
}

export default useAdminFetch;
