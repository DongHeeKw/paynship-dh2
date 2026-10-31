# PayNShip - Development & Testing Guide

> ⚠️ **Legacy Guide**
>
> 본 문서는 초기 구현 단계(2025) 기준 가이드입니다.  
> 현재 운영/배포 전 테스트 계획은 아래 문서를 우선 참조하세요.
> - `documents/Reference/Testing/PRELAUNCH_TEST_SCENARIOS_2026-02-18.md`
> - `documents/Reference/Deployment/DEPLOYMENT.md`

> 실제 구현 단계에서 테스트되고 기획/구현되어야 하는 요소들 정리

---

## 1. 스크래핑 시스템

### 1.1 쿠팡 (Coupang) 스크래퍼

#### 현재 상태
- Mock 데이터 반환 중
- 실제 스크래핑 시 HTTP2 프로토콜 오류 발생

#### 테스트해야 할 항목
| 항목 | 테스트 방법 | 예상 이슈 |
|------|-------------|-----------|
| 상품 페이지 접근 | 다양한 상품 URL 테스트 | Bot detection |
| 가격 추출 | 할인가/정가 구분 | DOM 구조 변경 |
| 옵션 추출 | 사이즈/색상/버전 | 동적 로딩 |
| 이미지 추출 | 대표 이미지 URL | CDN 접근 제한 |
| 카테고리 추출 | breadcrumb 파싱 | 다국어 처리 |

#### 구현 필요 사항
```typescript
// lib/scraper/coupang.ts 개선 필요

interface CoupangProduct {
  itemId: string;           // 쿠팡 상품 ID
  vendorId: string;         // 판매자 ID
  originalPrice: number;    // 정가
  salePrice: number;        // 할인가
  rocketDelivery: boolean;  // 로켓배송 여부
  options: CoupangOption[]; // 옵션 목록
}

// 필요한 기능:
// 1. Patchright 스텔스 모드 설정
// 2. 프록시 로테이션
// 3. 재시도 로직 (exponential backoff)
// 4. 캡차 감지 및 대응
```

#### 테스트 URL 목록
```
# 일반 상품
https://www.coupang.com/vp/products/12345...

# 로켓배송 상품
https://www.coupang.com/vp/products/67890...

# 옵션 있는 상품 (의류)
https://www.coupang.com/vp/products/...

# 디지털 상품 (앨범)
https://www.coupang.com/vp/products/...
```

---

### 1.2 네이버 쇼핑 (Naver Shopping) 스크래퍼

#### 현재 상태
- Mock 데이터 반환 중
- 일부 상품은 로그인 필요

#### 테스트해야 할 항목
| 항목 | 테스트 방법 | 예상 이슈 |
|------|-------------|-----------|
| 스마트스토어 상품 | smartstore.naver.com | iframe 구조 |
| 브랜드스토어 상품 | brand.naver.com | 별도 DOM |
| 가격 비교 페이지 | search.shopping.naver.com | 리다이렉트 |
| 해외직구 상품 | 배송비 별도 계산 | 추가 정보 필요 |

#### 구현 필요 사항
```typescript
// lib/scraper/naver.ts 개선 필요

interface NaverProduct {
  productId: string;
  mallName: string;         // 판매처 이름
  naverPay: boolean;        // 네이버페이 지원
  reviewCount: number;      // 리뷰 수
  rating: number;           // 평점
  deliveryInfo: string;     // 배송 정보
}

// 필요한 기능:
// 1. 스마트스토어 vs 브랜드스토어 구분
// 2. 네이버 로그인 처리 (필요시)
// 3. 동적 가격 로딩 대기
```

---

### 1.3 Gemini AI 파싱

#### 현재 상태
- 지원하지 않는 사이트의 HTML 파싱에 사용
- 프롬프트 최적화 필요

#### 테스트해야 할 항목
| 항목 | 테스트 방법 | 예상 이슈 |
|------|-------------|-----------|
| HTML → JSON 변환 | 다양한 사이트 HTML | 환각(hallucination) |
| 가격 정확도 | 실제 가격과 비교 | 통화 혼동 |
| 옵션 추출 | 복잡한 옵션 구조 | 누락 |
| 이미지 URL 추출 | CDN URL 패턴 | 상대경로 처리 |

#### 프롬프트 개선 필요
```typescript
// lib/gemini/client.ts

const PRODUCT_PARSING_PROMPT = `
당신은 한국 쇼핑몰 HTML을 분석하는 전문가입니다.

입력: HTML 전체 또는 일부
출력: JSON 형식의 상품 정보

주의사항:
1. 가격은 항상 한국 원화(KRW)로 변환
2. 할인가가 있으면 salePriceKrw에 저장
3. 옵션은 모두 추출 (재고 정보 포함)
4. 이미지 URL은 절대경로로 변환
5. 확실하지 않은 정보는 null 반환

출력 형식:
{
  "name": "상품명",
  "priceKrw": 숫자,
  "salePriceKrw": 숫자 또는 null,
  "imageUrl": "URL",
  "category": "카테고리",
  "options": [...],
  "confidence": 0.0-1.0
}
`;
```

---

## 2. 가격 계산 시스템

### 2.1 환율 API

#### 현재 상태
- exchangerate-api.com 무료 tier 사용
- Fallback: 1400 KRW/USD

#### 테스트해야 할 항목
| 항목 | 테스트 방법 | 예상 이슈 |
|------|-------------|-----------|
| API 응답 속도 | 다양한 시간대 | Rate limiting |
| 캐시 동작 | 1시간 캐시 검증 | 캐시 무효화 |
| Fallback 동작 | API 실패 시뮬레이션 | 환율 정확도 |

#### 구현 개선 필요
```typescript
// lib/calculator/exchange-rate.ts

// 고려사항:
// 1. 여러 환율 API 백업
// 2. 실시간 환율 vs 고정 환율 옵션
// 3. 환율 변동 알림 (큰 변동 시)
// 4. 프리미엄 고객용 실시간 환율
```

---

### 2.2 배송비 계산

#### 현재 상태
- 17개국 고정 요율 테이블
- 무게 기반 계산

#### 테스트해야 할 항목
| 항목 | 테스트 방법 | 예상 이슈 |
|------|-------------|-----------|
| 무게별 정확도 | 0.1kg ~ 30kg 테스트 | 대형 상품 |
| 국가별 정확도 | 모든 17개국 검증 | 특수 지역 |
| 부피무게 적용 | 부피무게 > 실무게 | 계산 복잡 |
| 추가 요금 | 도서산간, 특수포장 | 예외 케이스 |

#### 구현 개선 필요
```typescript
// lib/calculator/shipping.ts

interface ShippingCalculation {
  actualWeight: number;
  volumetricWeight: number;  // 추가 필요
  chargeableWeight: number;  // max(actual, volumetric)
  baseRate: number;
  surcharges: Surcharge[];   // 유류할증료, 성수기 등
  estimatedDays: { min: number; max: number };
}

// 추가 구현 필요:
// 1. 부피무게 계산 (L x W x H / 5000)
// 2. 유류할증료 (월별 변동)
// 3. 성수기 추가 요금
// 4. 특수 포장 요금 (깨지기 쉬운 물건 등)
```

---

### 2.3 관세/세금 계산

#### 현재 상태
- HS Code 기반 관세율
- 국가별 VAT/GST 테이블

#### 테스트해야 할 항목
| 항목 | 테스트 방법 | 예상 이슈 |
|------|-------------|-----------|
| HS Code 분류 | 카테고리별 정확도 | 모호한 분류 |
| 면세 한도 | 국가별 한도 검증 | 규정 변경 |
| 복합 세금 | 관세 + VAT + 기타 | 계산 순서 |
| FTA 적용 | 한-미, 한-EU 등 | 원산지 증명 |

#### 구현 개선 필요
```typescript
// lib/calculator/customs.ts

interface CustomsCalculation {
  hsCode: string;
  dutyRate: number;
  vatRate: number;
  otherTaxes: Tax[];        // 소비세, 환경세 등
  exemptionApplied: boolean; // 면세 적용 여부
  ftaApplied: boolean;       // FTA 적용 여부
  totalDuty: number;
}

// 추가 구현 필요:
// 1. 자동 HS Code 분류 (Gemini 활용)
// 2. FTA 적용 조건 검증
// 3. 규정 변경 자동 업데이트
// 4. 예상 통관 시간 안내
```

---

## 3. Shopify 연동

### 3.1 Draft Order API

#### 현재 상태
- Mock URL 생성
- 실제 API 연동 없음

#### 구현해야 할 항목
```typescript
// lib/shopify/draft-order.ts (신규 생성)

interface DraftOrderInput {
  lineItems: LineItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  email: string;
  note?: string;
  customAttributes?: Attribute[];
}

interface DraftOrderResponse {
  id: string;
  invoiceUrl: string;      // 결제 URL
  order?: Order;           // 결제 완료 시
  status: 'open' | 'invoice_sent' | 'completed';
}

// 구현 필요:
// 1. Shopify Admin API 연결
// 2. Draft Order 생성
// 3. Invoice URL 획득
// 4. 결제 완료 Webhook 처리
// 5. Order로 변환 확인
```

#### 테스트 시나리오
```
1. 단일 상품 주문
2. 복수 상품 주문
3. 옵션 포함 상품 주문
4. 결제 취소/환불
5. 부분 환불
```

---

### 3.2 결제 Webhook

#### 구현해야 할 항목
```typescript
// app/api/webhooks/shopify/route.ts (신규 생성)

// Webhook 종류:
// 1. orders/create - 주문 생성
// 2. orders/paid - 결제 완료
// 3. orders/cancelled - 주문 취소
// 4. refunds/create - 환불 생성

// 보안:
// 1. HMAC 검증
// 2. Webhook Secret 관리
// 3. 멱등성 처리 (중복 요청)
```

---

## 4. 사용자 경험 (UX)

### 4.1 에러 처리

#### 테스트해야 할 시나리오
| 시나리오 | 현재 동작 | 개선 필요 |
|----------|-----------|-----------|
| 스크래핑 실패 | 에러 메시지 표시 | 대안 제시 |
| 환율 API 실패 | Fallback 사용 | 사용자 알림 |
| 재고 부족 | 미처리 | 옵션 변경 안내 |
| 결제 실패 | 미처리 | 재시도/대안 |
| 네트워크 오류 | 에러 메시지 | 자동 재시도 |

#### 구현 필요
```typescript
// lib/errors/handler.ts (신규 생성)

class KBuyError extends Error {
  code: string;
  userMessage: string;      // 사용자에게 표시
  technicalMessage: string; // 로그용
  recoveryAction?: string;  // 복구 방법
}

// 에러 코드:
// SCRAPE_FAILED - 스크래핑 실패
// RATE_LIMIT - API 제한
// STOCK_OUT - 재고 없음
// PAYMENT_FAILED - 결제 실패
// NETWORK_ERROR - 네트워크 오류
```

---

### 4.2 로딩 상태

#### 개선 필요 항목
| 화면 | 현재 상태 | 개선 방향 |
|------|-----------|-----------|
| 스크래핑 중 | 텍스트만 | 프로그레스 바 |
| 가격 계산 중 | 텍스트만 | 단계별 표시 |
| 결제 처리 중 | 텍스트만 | 스켈레톤 UI |

---

### 4.3 반응형 디자인

#### 테스트 필요 화면
- [ ] 모바일 (320px ~ 480px)
- [ ] 태블릿 (768px ~ 1024px)
- [ ] 데스크톱 (1024px+)

#### 개선 필요 컴포넌트
- ProductGrid: 모바일에서 1열 표시
- Invoice: 모바일에서 스크롤 최적화
- Sidebar: 모바일에서 햄버거 메뉴

---

## 5. 보안

### 5.1 API 보안

| 항목 | 현재 상태 | 개선 필요 |
|------|-----------|-----------|
| Rate Limiting | 없음 | 구현 필요 |
| CORS | 기본 설정 | 제한 필요 |
| Input Validation | Zod 사용 | 추가 검증 |
| SQL Injection | Prisma ORM | 안전 |
| XSS | React 기본 | 검토 필요 |

### 5.2 결제 보안

| 항목 | 현재 상태 | 필요 사항 |
|------|-----------|-----------|
| HTTPS | Vercel 기본 | 확인 필요 |
| PCI DSS | Shopify 위임 | 문서화 |
| 환불 정책 | 미작성 | 작성 필요 |

---

## 6. 성능

### 6.1 측정 필요 항목

| 항목 | 목표 | 현재 |
|------|------|------|
| 첫 페이지 로드 | < 3초 | 미측정 |
| 스크래핑 완료 | < 10초 | Mock: 즉시 |
| 가격 계산 | < 2초 | ~1초 |
| 결제 URL 생성 | < 3초 | Mock: 2.5초 |

### 6.2 최적화 포인트

- [ ] 이미지 lazy loading
- [ ] API 응답 캐싱
- [ ] 코드 스플리팅
- [ ] 스켈레톤 UI

---

## 7. 테스트 체크리스트

### 7.1 Unit Tests (미구현)

```bash
# 구현 필요
npm run test:unit

# 테스트 대상:
# - lib/calculator/*.ts
# - lib/scraper/*.ts
# - lib/agent/*.ts
```

### 7.2 Integration Tests (미구현)

```bash
# 구현 필요
npm run test:integration

# 테스트 대상:
# - 전체 스크래핑 플로우
# - 전체 결제 플로우
# - Agent orchestration
```

### 7.3 E2E Tests (미구현)

```bash
# Playwright 테스트 구현 필요
npm run test:e2e

# 시나리오:
# 1. URL 입력 → 상품 표시 → 결제 완료
# 2. 추천 요청 → 상품 선택 → 결제 완료
# 3. 장바구니 → 복수 상품 결제
```

---

## 8. 배포 체크리스트

### 8.1 환경 변수 확인

```bash
# 필수
GEMINI_API_KEY=✅
DATABASE_URL=✅ (Supabase)
NEXT_PUBLIC_SUPABASE_URL=✅
NEXT_PUBLIC_SUPABASE_ANON_KEY=✅

# Shopify (결제 시 필수)
SHOPIFY_STORE_URL=❌
SHOPIFY_ADMIN_API_KEY=❌
SHOPIFY_STOREFRONT_API_KEY=❌

# 선택
ENABLE_MOCK_SCRAPER=production에서 false
EXCHANGE_RATE_API_KEY=❌
```

### 8.2 배포 전 검증

- [ ] TypeScript 빌드 성공
- [ ] ESLint 오류 없음
- [ ] Prisma 마이그레이션
- [ ] 환경 변수 설정
- [ ] 도메인 연결
- [ ] SSL 인증서

---

## 9. 모니터링

### 9.1 로깅

```typescript
// 구현 필요: lib/logger.ts

// 로그 레벨:
// ERROR - 에러 발생
// WARN - 경고 (재시도 등)
// INFO - 주요 이벤트
// DEBUG - 개발 디버깅

// 로그 대상:
// - 스크래핑 성공/실패
// - 결제 성공/실패
// - API 호출 시간
// - 에러 스택 트레이스
```

### 9.2 알림

```typescript
// 구현 필요: lib/alerts.ts

// 알림 조건:
// - 스크래핑 실패율 > 30%
// - API 응답 시간 > 10초
// - 결제 실패 연속 3회
// - 에러 급증
```

---

## 10. 문서화 필요 항목

- [ ] API 문서 (OpenAPI/Swagger)
- [ ] 사용자 가이드
- [ ] 관리자 가이드
- [ ] FAQ
- [ ] 개인정보처리방침
- [ ] 이용약관
- [ ] 환불 정책

---

> **Last Updated**: 2024-12-08
> **Author**: PayNShip Development Team
