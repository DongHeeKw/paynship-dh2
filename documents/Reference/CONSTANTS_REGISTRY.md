# Constants Registry

> PayNShip 코드베이스의 모든 SSoT 상수 카탈로그
>
> 마지막 감사: 2026-04-15 (v6.0 상수 추가)
>
> 참고: 일부 항목은 히스토리 기록이며, 운영 우선 참조 문서는
> `documents/Features/STATUS.md`, `.env.example`, `lib/admin/types.ts` 입니다.

## v6.0 추가 상수 (2026-04-15)

| 상수 | 값 | 위치/SSoT |
|------|-----|----------|
| `SEASON_REGEX` | `/^(SS\|FW\|AW)\d{2}$\|^\d{4}-[01]\d$/` | `lib/scraper/identity-extractor.ts` |
| `VOLUMETRIC_DIVISOR` | `5000` | `lib/calculator/volumetric.ts` |
| `SHOPIFY_PRODUCT_TTL_HOURS` | `72` | `lib/shopify/lifecycle.ts` |
| `RESCRAPE_INTERVAL_HOURS` | `3` | `AdminSettings.rescrape_interval_hours` |
| `DEFAULT_SERVICE_FEE_RATE` | `0.10` | `AdminSettings.service_fee_rate` (override) |
| `GUEST_PIVOT_SEARCH_LIMIT` | `3` | `AdminSettings.guest_pivot_limit` |
| `EU_DUTY_EFFECTIVE_FROM` | `"2026-07-01"` | `lib/compliance/duty-rules.ts` |
| `EU_FLAT_DUTY_EUR_PER_HEADING` | `3` | `lib/compliance/duty-rules.ts` |
| `US_DE_MINIMIS_EFFECTIVE_FROM` | `"2026-02-24"` (suspended) | `lib/compliance/duty-rules.ts` |
| `JP_DE_MINIMIS_JPY` | `10000` (per parcel) | `lib/compliance/duty-rules.ts` |
| `AU_DE_MINIMIS_AUD` | `1000` (per consignment) | `lib/compliance/duty-rules.ts` |
| `BRAND_DOMAIN_CONFIDENCE_THRESHOLD` | `0.70` | `lib/scraper/brand-domain-resolver.ts` |
| `UNDERVALUATION_THRESHOLD_RATIO` | `0.30` | `lib/compliance/undervaluation.ts` |

## Policy Integration 추가 상수 (2026-04-16)

| 상수 | 값 | 위치/SSoT |
|------|-----|----------|
| `INSPECTION_DETAIL_PRICE_USD` | `7` | `AdminSettings.inspection_detail_price_usd` |
| `INSPECTION_RESPONSE_DEADLINE_HOURS` | `72` | `AdminSettings.inspection_response_deadline_hours` |
| `RETURN_REQUEST_WINDOW_BIZ_DAYS` | `5` | `AdminSettings.return_request_window_biz_days` |
| `RETURN_SHIP_DEADLINE_CAL_DAYS` | `7` | `AdminSettings.return_ship_deadline_cal_days` |
| `RETURN_ARRIVE_DEADLINE_CAL_DAYS` | `14` | `AdminSettings.return_arrive_deadline_cal_days` |
| `CANCELLATION_PROCESSING_FEE_USD` | `5` | `AdminSettings.cancellation_fee_usd` |
| `RETURN_PROCESSING_FEE_USD` | `10` | `AdminSettings.return_fee_usd` |
| `SHINHAN_RATE_CAPTURE_HOUR_KST` | `10` | `lib/forex/shinhan-scraper.ts` |
| `EXCHANGE_RATE_TTL_HOURS` | `24` | `lib/forex/*` |
| `ABANDONMENT_THRESHOLD_COEFFICIENT` | `1.0` | `AdminSettings.abandonment_threshold_coefficient` |
| `ABANDONMENT_CUSTOMER_GRACE_HOURS` | `48` | `AdminSettings.abandonment_customer_grace_hours` |
| `ABANDONMENT_DEFAULT_REINSPECTION_KRW` | `5000` | `AdminSettings.abandonment_reinspection_krw` |
| `ABANDONMENT_DEFAULT_SELLER_RETURN_KRW` | `10000` | `AdminSettings.abandonment_seller_return_krw` |
| `CHARGEBACK_ABUSE_OBSERVATION_THRESHOLD` | `1` | `AdminSettings.chargeback_observation_threshold` |
| `CHARGEBACK_ABUSE_BLOCK_THRESHOLD` | `2` | `AdminSettings.chargeback_block_threshold` |
| `SUPPORTED_CURRENCIES_DEFAULT` | `["USD","JPY","EUR","GBP","CAD","AUD","SGD","CNY"]` | `SupportedCurrency` table |

---

## 개요

이 문서는 코드베이스의 모든 중요 상수와 그 SSoT(Single Source of Truth) 위치를 기록합니다.
새로운 상수 추가 시 반드시 이 문서에 등록하고, 리팩토링 시 위반 사항을 확인하세요.

### 상태 범례

| 상태 | 설명 |
|------|------|
| ✅ SSoT | 단일 소스에서만 정의됨 |
| ⚠️ 중복 | 여러 곳에 정의되어 리팩토링 필요 |
| ❌ 위반 | SSoT 외부에서 하드코딩됨 |
| 🔧 TODO | SSoT 위치 결정 필요 |

---

## 1. 💰 Financial Constants

### 환율 (Exchange Rate)

| 상수 | 값 | SSoT 파일 | 상태 |
|------|-----|----------|------|
| `DEFAULT_EXCHANGE_RATE` | `1400` | `lib/calculator/exchange-rate.ts:37` | ✅ SSoT |

**위반 사항:** ✅ 모두 수정됨 (2025-12-25)
| 파일 | 라인 | 상태 |
|------|------|------|
| `components/product/ProductGrid.tsx` | 125 | ✅ `getExchangeRateSync()` 적용 |
| `components/cart/CartPanel.tsx` | 186 | ✅ `getExchangeRateSync()` 적용 |

**Resolver 함수:**
```typescript
// lib/calculator/exchange-rate.ts
export async function getExchangeRate(): Promise<number>
export function getExchangeRateSync(): number  // 캐시/fallback only
```

**구현 상태:** ✅ PARTIAL
- [x] 외부 환율 API 연동 (exchangerate-api.com)
- [x] 캐싱 로직 (TTL 1시간)
- [x] Mock 모드 지원 (AdminSettings.useMockCalculator)
- [ ] TODO: 프리미엄 API 연동 (하나은행, 네이버 실시간)

---

### 서비스 수수료 (Service Fee)

| 상수 | 값 | SSoT 파일 | 상태 |
|------|-----|----------|------|
| `SERVICE_FEE_RATE` | `0.10` (10%) | `lib/constants/business.ts:24` | ✅ SSoT |

**마이그레이션 완료:** ✅ (2025-12-25)
| 파일 | 라인 | 상태 |
|------|------|------|
| `lib/calculator/price.ts` | 122 | ✅ import 완료 |
| `lib/calculator/mocks.ts` | 121 | ✅ import 완료 |

---

### DIM Factor (부피 무게 계수)

| 상수 | 값 | SSoT 파일 | 상태 |
|------|-----|----------|------|
| `DIM_FACTOR` | `6000` | `lib/constants/business.ts:40` | ✅ SSoT |

**참고:** K-Packet/EMS 표준 (6000), DHL/FedEx는 5000 사용

**마이그레이션 완료:** ✅ (2025-12-25)
- `lib/calculator/shipping.ts` → import from business.ts

---

### 통화 정밀도 (Currency Precision)

| 상수 | 값 | SSoT 파일 | 상태 |
|------|-----|----------|------|
| `CURRENCIES` | 6개 통화 설정 | `lib/constants/currency.ts:28-65` | ✅ SSoT |

**지원 통화:**
| 통화 | 코드 | 소수점 | 예시 |
|------|------|--------|------|
| 한국 원 | KRW | 0 | ₩29,990 |
| 미국 달러 | USD | 2 | $29.99 |
| 중국 위안 | CNY | 2 | ¥199.99 |
| 일본 엔 | JPY | 0 | ¥2,999 |
| 유로 | EUR | 2 | €29.99 |
| 영국 파운드 | GBP | 2 | £29.99 |

**Helper 함수:**
```typescript
// lib/constants/currency.ts
roundCurrency(amount: number, currency: CurrencyCode): number
formatCurrency(amount: number, currency: CurrencyCode): string
roundKRW(amount: number): number   // Math.round(amount)
roundUSD(amount: number): number   // Math.round(amount * 100) / 100
isValidPrecision(amount: number, currency: CurrencyCode): boolean
```

---

## 2. 🤖 LLM Configuration

### 기본 모델/프로바이더

| 상수 | 값 | SSoT 파일 | 상태 |
|------|-----|----------|------|
| `DEFAULT_LLM_MODEL` | `gemini-3-flash-preview` | `lib/constants/llm.ts:22` | ✅ SSoT |
| `DEFAULT_LLM_PROVIDER` | `gemini` | `lib/constants/llm.ts:27` | ✅ SSoT |

### 모델 목록 및 가격

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `LLM_MODELS` | `lib/constants/llm.ts:62-120` | ✅ SSoT |
| `getModelPricing()` | `lib/constants/llm.ts:137-144` | ✅ SSoT |

**마이그레이션 완료:** ✅ (2025-12-25)
| 파일 | 상태 |
|------|------|
| `components/admin/AdminSettingsModal.tsx` | ✅ `getModelsForProvider()` 사용 |
| `app/admin/settings/page.tsx` | ✅ `LLM_MODELS` 사용 |
| `lib/agent/usage-tracker.ts` | ✅ `getModelPricing()` + EXTENDED_PRICING |

**Helper 함수:**
```typescript
// lib/constants/llm.ts
export function getModelPricing(modelId: string): { input: number; output: number }
export function getModelsForProvider(provider: LLMProvider): LLMModelInfo[]
export function formatModelPrice(modelId: string): string
```

---

## 3. 📦 Product Estimation Tables

### 무게 추정 (Weight Estimation)

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `WEIGHT_MAP` | `lib/scraper/parser/normalizers.ts:165-174` | ✅ SSoT |

**테이블:**
| Category | Weight (kg) |
|----------|-------------|
| CD/Album | 0.5 |
| Cosmetics | 0.3 |
| Fashion | 0.5 |
| Electronics | 0.8 |
| Food | 0.5 |
| Books | 0.4 |
| Accessories | 0.2 |
| Other (default) | 0.5 |

**Resolver 함수:**
```typescript
export function estimateWeight(category: string): number
```

---

### HS Code 추정 (HS Code Estimation)

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `HS_CODE_MAP` | `lib/scraper/parser/normalizers.ts:190-198` | ✅ SSoT |

**테이블:**
| Category | HS Code | 품목 |
|----------|---------|------|
| CD/Album | 8523.49 | 기록매체 |
| Cosmetics | 3304.99 | 화장품 |
| Fashion | 6204.63 | 의류 |
| Electronics | 8517.62 | 전자기기 |
| Food | 2106.90 | 식품 |
| Books | 4901.99 | 서적 |
| Accessories | 7117.90 | 액세서리 |
| (default) | 9999.99 | 기타 |

**Resolver 함수:**
```typescript
export function getCategoryHSCode(category: string): string
```

---

### 카테고리 패턴 (Category Patterns)

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `CATEGORY_PATTERNS` | `lib/scraper/parser/normalizers.ts:133-147` | ✅ SSoT |

**Resolver 함수:**
```typescript
export function detectCategory(name: string): string
```

---

## 4. 🚚 Shipping & Customs

### 배송료 테이블

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `SHIPPING_RATES` | `lib/calculator/shipping.ts` | ✅ SSoT |

**지원 국가:** US, JP, CN, SG, AU, GB, DE, FR, CA, HK, TW, TH, VN, MY, PH, ID, IN (17개국)

---

### 관세율 테이블

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `HS_CODE_RATES` | `lib/calculator/customs.ts` | ✅ SSoT |
| `VAT_RATES` | `lib/calculator/customs.ts` | ✅ SSoT |
| `DUTY_FREE_THRESHOLDS` | `lib/calculator/customs.ts` | ✅ SSoT |

---

## 5. 🎨 UI Constants

### Action Types

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `ActionType` | `lib/agent/llm-types.ts` | ✅ SSoT |

**값:** `search`, `show_product`, `parse_url`, `add_to_cart`, `show_cart`, `calculate_shipping`, `checkout`, `show_memory`, `clear_memory`, `none`

### Action → UI Mapping

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `ACTION_TO_UI_MAP` | `lib/agent/action-map.ts` | ✅ SSoT |

### Intent Routes

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `ROUTES` | `lib/agent/semantic-router.ts` | ✅ SSoT |

### Order Status

| 상수 | SSoT 파일 | 상태 |
|------|----------|------|
| `OrderStatus` enum | `prisma/schema.prisma:235-241` | ✅ SSoT (DB) |
| `ORDER_STATUS_LABELS` | `lib/admin/types.ts` | ✅ SSoT (UI) |

---

## 6. 🔐 Environment Variables

환경변수는 `.env.example`에 문서화되어야 합니다.

### 필수 (Required)

| 변수 | 용도 | 기본값 |
|------|------|--------|
| `DATABASE_URL` | Supabase PostgreSQL | - |
| `DIRECT_URL` | Prisma direct connection | - |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Auth | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth | - |
| `GEMINI_API_KEY` | Primary LLM | - |
| `SESSION_SECRET` | Session token signing | - |

### 선택 (Optional)

| 변수 | 용도 | 기본값 |
|------|------|--------|
| `CLAUDE_API_KEY` | Alternative LLM | - |
| `TAVILY_API_KEY` | Web search | - |
| `NAVER_CLIENT_ID` | Naver Shopping API | - |
| `NAVER_CLIENT_SECRET` | Naver Shopping API | - |
| `ENABLE_MOCK_CHECKOUT` | Demo checkout 전환 | `false` |
| `CRON_SECRET` | `/api/cron/cleanup` 보호 | - |
| `CRON_LOG_RETENTION_DAYS` | cleanup 보존일 | `30` |

추가 메모:
- Scraper/Calculator mock 토글은 주로 Admin Settings DB 필드(`useMockScraper`, `useMockCalculator`)로 운영한다.

---

## 7. 리팩토링 체크리스트

### Phase 1: 상수 통합 (High Priority)

- [x] `lib/constants/business.ts` 생성 ✅
  - [x] `SERVICE_FEE_RATE` 정의
  - [x] 기타 비즈니스 상수 (DIM_FACTOR, 캐시 TTL 등)
- [x] `lib/constants/llm.ts` 확장 ✅
  - [x] `LLM_MODELS` 추가 (모델 목록 + 가격)
  - [x] Helper 함수 (getModelPricing, getModelsForProvider, formatModelPrice)
- [x] 환율 하드코딩 수정 ✅
  - [x] `ProductGrid.tsx` 수정
  - [x] `CartPanel.tsx` 수정

### Phase 2: Resolver 패턴 적용

- [x] `getExchangeRate()` Resolver 개선 (Mock/Cache/API/Fallback) ✅
- [ ] `getServiceFeeRate()` Resolver 생성
- [ ] Mock 전환 테스트
- [ ] 기존 코드에서 SERVICE_FEE_RATE import로 교체

### Phase 3: 검증

- [x] Grep 검사 통과 (환율)
- [x] 빌드 성공
- [ ] 단위 테스트 통과

---

## Changelog

| 날짜 | 변경 |
|------|------|
| 2025-12-25 | 초안 작성, 위반 사항 식별 |
| 2025-12-25 | 환율 Resolver 패턴 구현, 하드코딩 수정, business.ts 생성 |
| 2025-12-25 | LLM_MODELS SSoT 통합 완료 (llm.ts 확장, 3개 파일 마이그레이션) |
| 2025-12-25 | P0 스파게티 수정: SERVICE_FEE_RATE, DIM_FACTOR import 통합 |
| 2025-12-25 | P2 수정: CartItem.priceKrw Int→Float, optionPriceAdjustment Int→Float |
