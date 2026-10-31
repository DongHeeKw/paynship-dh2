/**
 * Type Guards
 *
 * 런타임 타입 검증 함수
 * - Prisma JSON 필드에서 가져온 데이터 검증
 * - API 응답 데이터 검증
 * - 외부 소스 데이터의 타입 안전성 보장
 */

import { Prisma } from '@prisma/client';
import type { ScrapedProduct, CartItem } from '@/types';
// Historical session JSON may contain search results. This shape does not invoke a model.
interface SearchResult {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

// ============================================================================
// Primitive Guards
// ============================================================================

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// ============================================================================
// Product Guards
// ============================================================================

/**
 * ScrapedProduct 타입 가드
 * Prisma JSON 필드나 API 응답에서 가져온 데이터 검증
 */
export function isScrapedProduct(value: unknown): value is ScrapedProduct {
  if (!isObject(value)) return false;

  // Required fields
  const hasRequiredFields = (
    isString(value.id) &&
    isString(value.name) &&
    isNumber(value.priceKrw) &&
    isString(value.sourceUrl)
  );

  if (!hasRequiredFields) return false;

  // Optional fields validation (if present)
  if (value.category !== undefined && !isString(value.category)) return false;
  if (value.weightKg !== undefined && !isNumber(value.weightKg)) return false;
  if (value.hsCode !== undefined && !isString(value.hsCode)) return false;

  return true;
}

/**
 * ScrapedProduct 배열 타입 가드
 */
export function isScrapedProductArray(value: unknown): value is ScrapedProduct[] {
  if (!isArray(value)) return false;
  return value.every(isScrapedProduct);
}

// ============================================================================
// Search Result Guards
// ============================================================================

/**
 * SearchResult 타입 가드
 */
export function isSearchResult(value: unknown): value is SearchResult {
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isString(value.name) &&
    isNumber(value.price) &&
    isString(value.imageUrl)
  );
}

/**
 * SearchResult 배열 타입 가드
 */
export function isSearchResultArray(value: unknown): value is SearchResult[] {
  if (!isArray(value)) return false;
  return value.every(isSearchResult);
}

// ============================================================================
// Cart Guards
// ============================================================================

/**
 * CartItem 타입 가드
 */
export function isCartItem(value: unknown): value is CartItem {
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isNumber(value.quantity) &&
    (value.product === undefined || isScrapedProduct(value.product))
  );
}

/**
 * CartItem 배열 타입 가드
 */
export function isCartItemArray(value: unknown): value is CartItem[] {
  if (!isArray(value)) return false;
  return value.every(isCartItem);
}

// ============================================================================
// Prisma JSON Helpers
// ============================================================================

/**
 * Prisma InputJsonValue로 안전하게 변환
 * 순환 참조나 undefined 값 제거
 */
export function toPrismaJson<T>(value: T): Prisma.InputJsonValue | null {
  if (value === undefined || value === null) {
    return null;
  }

  // JSON 직렬화/역직렬화로 순환 참조 및 undefined 제거
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Prisma JsonValue에서 타입 안전하게 추출
 */
export function fromPrismaJson<T>(
  value: Prisma.JsonValue,
  guard: (v: unknown) => v is T
): T | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (guard(value)) {
    return value;
  }

  return null;
}

/**
 * Prisma JsonValue에서 배열 타입 안전하게 추출
 */
export function fromPrismaJsonArray<T>(
  value: Prisma.JsonValue,
  itemGuard: (v: unknown) => v is T
): T[] {
  if (!isArray(value)) {
    return [];
  }

  return value.filter(itemGuard) as T[];
}

// ============================================================================
// Session Context Guards
// ============================================================================

export interface SessionContext {
  lastSearchQuery?: string;
  lastSearchResults?: SearchResult[];
  selectedProductUrl?: string;
  lastAction?: string;
}

/**
 * SessionContext 타입 가드
 */
export function isSessionContext(value: unknown): value is SessionContext {
  if (!isObject(value)) return false;

  // All fields are optional, just validate types if present
  if (value.lastSearchQuery !== undefined && !isString(value.lastSearchQuery)) return false;
  if (value.lastSearchResults !== undefined && !isSearchResultArray(value.lastSearchResults)) return false;
  if (value.selectedProductUrl !== undefined && !isString(value.selectedProductUrl)) return false;
  if (value.lastAction !== undefined && !isString(value.lastAction)) return false;

  return true;
}

// ============================================================================
// Utility Type Guards
// ============================================================================

/**
 * Non-null assertion guard
 */
export function assertNonNull<T>(
  value: T | null | undefined,
  message = 'Value is null or undefined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Type assertion with validation
 */
export function assertType<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  message = 'Type assertion failed'
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message);
  }
}
