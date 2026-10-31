# Landed Cost Structure & Fee Schedule

> **Date**: 2026-04-16
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

기존 v6 플랜은 최종 결제 금액을 `A(상품가) + B(배송+관세) + C(10% 수수료)` 로 정의했다. 정책 문서는 이를 더 고객 친화적인 **Landed Cost 4-항목** 구조로 재정의하며, 통화·수수료·검수 옵션까지 포함해 확정했다.

---

## Decision

### 1. Landed Cost 4-항목 구조

고객이 Checkout에서 보는 결제 금액은 아래 4개 항목으로 구성된다.

| 항목 | 계산 |
|------|------|
| ① 상품 금액 | 한국 원판매가 (KRW) |
| ② 결제 및 대행 수수료 | (①+③+④) × **10%** — 기존 v6의 C에 해당 |
| ③ 예상 국제 배송비 | Shopify `draftOrderCalculate` 반환값 |
| ④ 관세 및 부가세 (DDP) | Shopify `draftOrderCalculate` 반환값 |

**10% 수수료는 기존 값 유지.** 표현만 "서비스 수수료"에서 **"결제 및 대행 수수료"** 로 통일. Admin에서 국가/구간별 cap은 그대로 동작.

### 2. 통화 처리 (Dual Currency)

- **Shop Currency**: **KRW** (내부 계산 기준)
- **Presentment Currency**: 고객이 프론트에서 토글로 선택한 통화 (USD, JPY, EUR, GBP, CAD, AUD, SGD, CNY 등)
- 환율 소스: **신한은행 오전 10시 (KST) 고시환율** 스크래핑 + 24h 유지
- Admin Settings에서 **수동 ±조정** 가능 (리스크 헷지 버퍼)
- 지원 통화 목록도 Admin Settings에서 관리 (활성/비활성)
- **Quote 생성 시점의 환율을 Quote에 영속화** → Quote 만료(24h) 전까지 해당 환율 고정

### 3. 수수료 Schedule (USD 고정값, Admin 조정 가능)

| 수수료 | 금액 | 시점 |
|--------|------|------|
| 결제 및 대행 수수료 | **10%** (FeeCapRule 적용) | 주문 결제 |
| **출고 전 취소 수수료** | **$5 USD + 원판매처 왕복 배송비 실비** | Stage 2 취소 |
| **출고 후 하자 반품 수수료** | **$10 USD 고정 차감** | Return |
| **Detail Inspection (선택)** | **$7 USD/셀러** | Checkout 업셀 |

### 4. Detail Inspection 옵션

- **Basic ($0)**: 기본, 미개봉 재포장 (정책 기본값)
- **Detail ($7 USD / 셀러)**: 고객이 Checkout에서 선택, 셀러 단위로 가산
  - 예: 3개 셀러에서 합배송 → Detail 선택 시 $7 × 3 = $21
- Admin Settings에서 가격 수정 가능

### 5. 환율 데이터 모델

```prisma
model ExchangeRate {
  id                String   @id @default(uuid())
  currencyCode      String                   // USD, JPY, ...
  baseCurrency      String   @default("KRW")
  shinhanRate       Float                    // 신한은행 10am 원본
  adminAdjustment   Float    @default(0)     // ±% 조정
  effectiveRate     Float                    // shinhanRate × (1 + adminAdjustment/100)
  capturedAt        DateTime                 // 스크래핑 시각
  expiresAt         DateTime                 // capturedAt + 24h
  source            String   @default("SHINHAN_BANK_10AM")
  createdAt         DateTime @default(now())

  @@index([currencyCode, expiresAt])
}

model SupportedCurrency {
  code              String   @id              // ISO 4217
  displayName       String
  symbol            String
  active            Boolean  @default(true)
  defaultForCountry String[]                   // 기본 적용 국가 ISO2 배열
  sortOrder         Int      @default(0)
}
```

---

## Rationale

- **Landed Cost 구조는 국제 이커머스 표준**이며 고객이 total cost를 한눈에 파악 가능
- 10% 유지로 기존 계산 로직 변경 최소화
- 통화 분리로 Shopify Markets 기능 최대 활용 + 자체 환율 관리로 환차 버퍼 확보
- 신한은행 10am 환율은 한국 수출입 기업 표준 참고지표 (세무·회계 친화)
- 셀러 단위 $7은 "같은 셀러에서 한 번 개봉 검수"가 단위이므로 합리적

### Considered Alternatives

1. **Total Cost 단일 표시**: 투명성 저하, 통관 비용 변동에 대한 고객 저항 증가. 기각.
2. **실시간 환율 (분당 갱신)**: 소규모 주문 변동성 과도, 회계 번거로움. 기각.
3. **Inspection 주문 단위 고정 $7**: 합배송 3 셀러 시 검수 부담이 3배인데 비용은 같아 손익 악화. 기각.

---

## Consequences

### Positive

- 결제 페이지의 breakdown이 4줄로 명확 → 전환률·신뢰도 상승 기대
- 통화 토글로 해외 결제 저항 감소
- Inspection 업셀 수익화 포인트 확보

### Negative

- 신한은행 환율 스크래핑 자동화 필요 (JS 렌더링 사이트)
- 환율 24h 캐시 + Quote 고정의 상태 관리 복잡도 증가
- Inspection 셀러 단위 매칭 로직 필요 (Cart 내 셀러 grouping)

### Risks

- 신한은행 사이트 구조 변경 → 매일 오전 fallback 필요 (Admin 수동 입력)
- Quote 만료 전 급격한 환율 변동 → 고객 vs 회사 손실 감수 구간 존재 (24h buffer로 제한)
- Inspection 가격 국가별 민감도 — 초기 $7은 실험값, 운영 데이터로 재조정

---

## Implementation

- Plan: [2026-04-16-policy-integration-plan.md](../../docs/plans/2026-04-16-policy-integration-plan.md)
- Spec: [Inspection-Options/Spec](../Features/Inspection-Options/Spec.md)
- Affected: Calculator/Spec, Quote/Spec, Cart/Spec, Order-Checkout/Spec, Admin-Settings/Spec, Customer Frontend PRD, DB Schema

---

## Related

- [ADR: Payment_Proxy_Service_Positioning](2026-04-16_ADR_Payment_Proxy_Service_Positioning.md)
- [ADR: Shopify_As_Shipping_Backend](2026-04-15_ADR_Shopify_As_Shipping_Backend.md)
- 원본 정책: `docs/external-inputs/2026-04-15-policies/terms/3. Orders and Shipping 정책.md`
