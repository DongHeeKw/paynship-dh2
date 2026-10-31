/**
 * Business Constants - Fallback Values
 *
 * 비즈니스 설정의 Fallback 상수.
 * 이 값들은 DB(AdminSettings)에 값이 없거나 DB 접근 실패 시 사용됩니다.
 *
 * ⚠️ 주의: 이 파일의 상수를 직접 import하지 마세요!
 *
 * ✅ 올바른 사용:
 *   import { getServiceFeeRate } from '@/lib/business';
 *   const feeRate = await getServiceFeeRate();
 *
 * ❌ 잘못된 사용:
 *   import { SERVICE_FEE_RATE } from '@/lib/constants/business';
 *
 * @module lib/constants/business
 * @see lib/business/settings.ts - SSoT Resolver
 * @see documents/Reference/CONSTANTS_REGISTRY.md
 */

// ============================================================================
// Fallback Constants (Used by lib/business/settings.ts Resolver)
// ============================================================================

// 가격 설정
export const FALLBACK_SERVICE_FEE_RATE = 0.10;     // 서비스 수수료율 (10%)
export const FALLBACK_MIN_ORDER_USD = 10;           // 최소 주문 금액 (USD)
export const FALLBACK_MAX_ORDER_USD = 2000;         // 최대 주문 금액 (USD)

// 환율 설정
export const FALLBACK_EXCHANGE_RATE = 1400;         // 기본 환율 (KRW/USD)

// 배송 설정
export const FALLBACK_ENABLED_COUNTRIES = [
  'US', 'JP', 'CN', 'SG', 'AU', 'GB', 'DE', 'FR', 'CA',
  'HK', 'TW', 'TH', 'VN', 'MY', 'PH', 'ID', 'IN',
];
export const FALLBACK_DEFAULT_PRODUCT_WEIGHT_KG = 0.5;  // 기본 상품 무게 (kg)
export const FALLBACK_MAX_PRODUCT_WEIGHT_KG = 30;       // 최대 배송 가능 무게 (kg)
export const FALLBACK_DIM_FACTOR = 6000;                 // K-Packet/EMS 기준

// ============================================================================
// Legacy Aliases (Backward Compatibility)
// ⚠️ Deprecated: 새 코드에서는 lib/business/settings.ts 사용
// ============================================================================

/** @deprecated Use getServiceFeeRate() from lib/business */
export const SERVICE_FEE_RATE = FALLBACK_SERVICE_FEE_RATE;

/** @deprecated Use getOrderLimits() from lib/business */
export const MIN_ORDER_AMOUNT_USD = FALLBACK_MIN_ORDER_USD;

/** @deprecated Use getOrderLimits() from lib/business */
export const MAX_ORDER_AMOUNT_USD = FALLBACK_MAX_ORDER_USD;

/** @deprecated Use getDimFactor() from lib/business */
export const DIM_FACTOR = FALLBACK_DIM_FACTOR;

/** @deprecated Use getShippingSettings().defaultProductWeightKg from lib/business */
export const DEFAULT_PRODUCT_WEIGHT_KG = FALLBACK_DEFAULT_PRODUCT_WEIGHT_KG;

/** @deprecated Use getShippingSettings().maxProductWeightKg from lib/business */
export const MAX_PRODUCT_WEIGHT_KG = FALLBACK_MAX_PRODUCT_WEIGHT_KG;

// ============================================================================
// Cache TTL (Not business settings, keep as constants)
// ============================================================================

/**
 * 환율 캐시 TTL (1시간)
 */
export const EXCHANGE_RATE_CACHE_TTL_MS = 1000 * 60 * 60;

/**
 * 상품 정보 캐시 TTL (24시간)
 */
export const PRODUCT_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

/**
 * Admin 설정 캐시 TTL (5초)
 */
export const ADMIN_SETTINGS_CACHE_TTL_MS = 1000 * 5;
