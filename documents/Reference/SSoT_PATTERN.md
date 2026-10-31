# SSoT (Single Source of Truth) Pattern Guide

> 이 문서는 PayNShip 코드베이스에서 상수, 설정값, 외부 의존성 데이터를 관리하는 표준 패턴을 정의합니다.

> 🔄 **v6.0 추가 패턴** (2026-04-15):
>
> 1. **Public/Internal View 분리**: Product 같은 엔티티는 `toPublicView()` / `toAdminView()` 두 직렬화 함수로만 외부 노출. `internalMetadata`는 Admin Role 가드 필수.
> 2. **Shopify 위임 SSoT**: 배송비·관세·세금은 Shopify `draftOrderCalculate` 결과가 SSoT. 자체 Calculator는 **수수료 overlay** 한 층만 소유.
> 3. **Mirror Pattern**: Shopify 저장 박스 목록처럼 조회 API가 없는 리소스는 로컬 DB가 읽기 SSoT, 쓰기는 Shopify ↔ 양방향 동기.

---

## 핵심 원칙

1. **하나의 진실**: 모든 값은 단 하나의 파일에서만 정의
2. **Resolver 패턴**: 외부 의존성 있는 값은 Resolver 함수를 통해 접근
3. **Mock 전환 가능**: 개발/테스트 시 Mock 값으로 전환 가능
4. **Graceful Fallback**: API 실패 시 SSoT 상수로 fallback
5. **[v6] Role-based Serialization**: DTO whitelist 방식 + admin guard
6. **[v6] Delegated Computation**: Shopify가 권위 있는 계산 소스일 때 자체 계산 금지

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Consumer Layer                         │
│           (Components, API Routes, Services)                │
│                                                             │
│   ❌ 직접 상수 참조 금지                                      │
│   ✅ Resolver 함수만 호출                                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Resolver Layer                          │
│              (lib/calculator/, lib/scraper/)                │
│                                                             │
│   export async function getValue(): Promise<T> {            │
│     if (isMockMode()) return FALLBACK_VALUE;                │
│     if (hasCache()) return getCached();                     │
│     try { return await fetchFromAPI(); }                    │
│     catch { return FALLBACK_VALUE; }                        │
│   }                                                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     SSoT Layer                              │
│                  (Constants, Types)                         │
│                                                             │
│   export const FALLBACK_VALUE = 1400;  // 절대 변경 불가     │
│   export const VALUE_TABLE = [...];    // 정적 테이블        │
└─────────────────────────────────────────────────────────────┘
```

---

## Resolver 구현 패턴

### 기본 템플릿

```typescript
// lib/[domain]/[feature].ts

// ============================================================================
// SSoT Constants (Fallback Values)
// ============================================================================

/**
 * [설명]
 * - 용도: [용도 설명]
 * - 출처: [값의 근거]
 * - TODO: [실제 연동 시 계획]
 */
export const DEFAULT_[NAME] = [value];

// ============================================================================
// Cache (Optional)
// ============================================================================

interface CachedValue {
  value: number;
  timestamp: number;
}

let cache: CachedValue | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1시간

function isCacheValid(): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_TTL_MS;
}

// ============================================================================
// Resolver
// ============================================================================

/**
 * [기능명] Resolver
 *
 * Resolution Order:
 * 1. Mock Mode → return DEFAULT_[NAME]
 * 2. Valid Cache → return cached value
 * 3. External API → fetch and cache
 * 4. Fallback → return DEFAULT_[NAME]
 */
export async function get[Name](): Promise<number> {
  // 1. Mock Mode Check
  const settings = await getAdminSettings();
  if (settings.useMock[Feature]) {
    return DEFAULT_[NAME];
  }

  // 2. Cache Check
  if (isCacheValid()) {
    return cache!.value;
  }

  // 3. External API (TODO: 실제 연동)
  try {
    const value = await fetch[Name]FromAPI();
    cache = { value, timestamp: Date.now() };
    return value;
  } catch (error) {
    logger.warn('[Feature]', `API failed, using fallback: ${error}`);
    // 4. Fallback
    return DEFAULT_[NAME];
  }
}

// ============================================================================
// Sync Version (for non-async contexts)
// ============================================================================

/**
 * 동기 버전 - 캐시 또는 fallback만 반환
 * UI 렌더링 등 async 사용 불가 컨텍스트용
 */
export function get[Name]Sync(): number {
  if (isCacheValid()) {
    return cache!.value;
  }
  return DEFAULT_[NAME];
}
```

---

## Mock Mode 규칙

### AdminSettings 연동

| Setting | 영향 범위 | Mock 동작 |
|---------|----------|----------|
| `useMockScraper` | 스크래퍼 | Mock 상품 데이터 반환 |
| `useMockCalculator` | 가격 계산 | 환율, 배송료 fallback 사용 |

### Mock Mode 체크 함수

```typescript
// lib/admin/index.ts
export async function isMockCalculatorEnabled(): Promise<boolean> {
  const settings = await getAdminSettings();
  return settings.useMockCalculator;
}

export async function isMockScraperEnabled(): Promise<boolean> {
  const settings = await getAdminSettings();
  return settings.useMockScraper;
}
```

### 환경변수 Override

```bash
# .env.local
ENABLE_MOCK_SCRAPER=true      # AdminSettings보다 우선
ENABLE_MOCK_CALCULATOR=true   # AdminSettings보다 우선
```

---

## 구현 상태 추적

각 Resolver의 구현 상태를 다음 형식으로 표시:

```typescript
/**
 * @status MOCK_ONLY | PARTIAL | REAL
 * @mockSource DEFAULT_EXCHANGE_RATE
 * @realSource TODO: 하나은행 API 연동 예정
 * @caching TTL 1시간
 */
```

### 상태 정의

| Status | 설명 |
|--------|------|
| `MOCK_ONLY` | Resolver 구조만 있고, 항상 fallback 반환 |
| `PARTIAL` | 일부 케이스만 실제 데이터 (예: 특정 국가만) |
| `REAL` | 실제 외부 연동 완료 |

---

## SSoT 위반 방지 규칙

### ❌ 금지 패턴

```typescript
// ❌ 컴포넌트에서 상수 직접 사용
const priceUsd = priceKrw / 1400;

// ❌ 같은 값을 여러 파일에 정의
// file1.ts: const RATE = 1400;
// file2.ts: const RATE = 1400;

// ❌ Resolver 없이 API 직접 호출
const rate = await fetch('https://api.exchange.com/rate');
```

### ✅ 권장 패턴

```typescript
// ✅ Resolver 함수 사용
import { getExchangeRate } from '@/lib/calculator/exchange-rate';
const rate = await getExchangeRate();
const priceUsd = priceKrw / rate;

// ✅ 동기 컨텍스트에서는 Sync 버전
import { getExchangeRateSync } from '@/lib/calculator/exchange-rate';
const rate = getExchangeRateSync();

// ✅ SSoT 상수 re-export (필요 시)
// lib/constants/index.ts
export { DEFAULT_EXCHANGE_RATE } from '@/lib/calculator/exchange-rate';
```

---

## 검증 방법

### Grep 검사

SSoT 위반 여부를 다음 명령어로 확인:

```bash
# 환율 하드코딩 검사 (SSoT 파일 제외)
grep -rn "/ 1400\|/ 1300\|/ 1500" --include="*.ts" --include="*.tsx" \
  | grep -v "exchange-rate.ts" \
  | grep -v "DEFAULT_EXCHANGE_RATE"

# 서비스 수수료 하드코딩 검사
grep -rn "0\.10\|0\.1[^0-9]" --include="*.ts" \
  | grep -v "SERVICE_FEE_RATE" \
  | grep -v "test"
```

### 린트 규칙 (향후)

```javascript
// eslint-plugin-ssot (향후 구현)
rules: {
  'ssot/no-magic-numbers': 'error',
  'ssot/use-resolver': 'error',
}
```

---

## 관련 문서

- [CONSTANTS_REGISTRY.md](./CONSTANTS_REGISTRY.md) - 모든 SSoT 상수 목록
- [STATUS.md](../Features/STATUS.md) - 기능별 구현 상태
- [CLAUDE.md](../../CLAUDE.md) - 개발 가이드라인

---

## Changelog

| 날짜 | 변경 |
|------|------|
| 2025-12-25 | 초안 작성 |
