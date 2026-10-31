# Domestic Procurement 9-Step State Machine (v2.0)

> **Date**: 2026-04-19
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

결제 후 해외 배송 완료까지 주문이 거치는 단계가 v1 대비 크게 세분화된다. 특히 한국 내 발주 → 입고 → 검수 → 해외 발송 각 단계에서 운영자 수동 작업 + 자동 스크레이핑 모니터링이 필요하다. 이 상태 전이를 일관되게 코드화하지 않으면 CS·운영자 간 상태 혼선이 발생한다.

---

## Decision

### State Machine

```
[Shopify orders/paid webhook]
         │
         ▼
─── Step 0: 주문접수 (ORDER_RECEIVED) ──────────
         │  고객: Shopify 결제 완료 메일 자동
         │  자동 환불 가능 (Shopify Refund API)
         │
         │ 운영자 [주문확인] 버튼 or SLA 타이머 만료
         ▼
─── Step 1: 주문확인 (ORDER_CONFIRMED) ─────────
         │  ⚠️ 이후 자동 환불 불가, 이메일 요청 경유
         │
         ▼
─── Step 1A: 발주중 (PROCUREMENT_IN_PROGRESS) ──
         │  최저가 링크 확보 (CatalogEntry.lowestPrice 참조)
         │  재발주 의사결정 기준: 고객이 본 "상품판매가" 이내
         │
         │ Operator 발주 완료 입력 (URL/결제수단/금액/주문번호)
         ▼
─── Step 1B: 발주완료 (PROCURED) ───────────────
         │  📧 고객: "국내 판매처에 발주 완료"
         │
         │ Scraper (1h CRON) → 발주처 URL에서 송장 감지
         ▼
─── Step 1C: 국내배송시작 (DOMESTIC_SHIPPING) ──
         │  📧 고객: "국내 배송 시작" (국내 송장 번호 포함)
         │
         │ [탐지] 발주처 URL에서 취소/품절 감지 분기
         │    ↓ (1D 분기)
         │
         │ 국내 송장 tracking → delivered
         ▼
─── Step 1E: 국내배송도착 (DOMESTIC_DELIVERED) ─
         │  (내부 알림만, 고객 알림 없음)
         │
         │ Warehouse 검수 완료 (Basic 또는 Detail)
         ▼
─── Step 1F: 배송입고확인 (WAREHOUSED) ─────────
         │  📧 고객: "상품 도착 및 검수 완료"
         │       (Detail 검수 시 사진/결과 첨부)
         │       (이상 발견 시 72h 응답 요청 → Inspection Response 플로우)
         │
         │ AcrossB 송장 발행 (합배송 박스 단위 1 송장)
         ▼
─── Step 1G: 해외발송준비 (INTL_SHIPMENT_CREATED) ─
         │  📧 고객: "국제 배송 시작" (AcrossB 추적 번호)
         │  Shopify fulfillmentCreateV2 트리거 → Shopify 고객 알림 자동
         │
         ▼
─── Step 1H: 해외배송시작 (INTL_IN_TRANSIT) ────
         │  AcrossB status webhook → Shopify 자동 업데이트
         │  Shopify 고객 알림 자동
         │
         ▼
─── Step 1I: 해외배송완료 (DELIVERED) ──────────
         │  AcrossB 최종 상태 → Shopify delivered
         │  Shopify 고객 알림 자동
         │
         ▼
       [Done]

── 1D 분기: 국내발주 취소/품절 (PROCUREMENT_FAILED) ──
  Scraper 감지 → Admin 알림
  │
  ├─ 재발주 가능 (고객 상품판매가 이내) → 1A로 복귀
  ├─ 재발주 불가 (초과) → 고객 알림 후 주문 취소 → Shopify Refund
  └─ 부분 취소 (일부 품절) → 금액 조정 후 재견적 + 고객 동의

── Return/Exchange 경로 ───────────────────────
  수령 후 5 biz days 내 하자 반품 접수 가능
  모든 반품은 관리자 수동 검토
  환불: Shopify Refund API + PortOne/PayPal 환불 자동 연동
```

### Customer Notification Matrix

| Step | 고객 채널 | 발송 주체 | 트리거 |
|------|---------|---------|-------|
| 0 | ✉️ Shopify 자동 | Shopify | orders/paid |
| 1 | — | — | 내부 |
| 1A | — | — | 내부 |
| 1B | ✉️ 우리 Email | 우리 | Operator 입력 |
| 1C | ✉️ 우리 Email + 인앱 | 우리 | 스크레이퍼 감지 |
| 1D | ✉️ 상황별 | 우리 | 관리자 결정 후 |
| 1E | — | — | 내부 |
| 1F | ✉️ 우리 Email (Detail 시 사진 포함) + 인앱 | 우리 | 검수 완료 |
| 1G | ✉️ Shopify 자동 (송장 포함) | Shopify | fulfillmentCreateV2 |
| 1H | ✉️ Shopify 자동 | Shopify | AcrossB webhook |
| 1I | ✉️ Shopify 자동 | Shopify | AcrossB delivered |

### 자동화 vs 수동 매트릭스

| Step | 자동 | 수동 |
|------|:---:|:---:|
| 0 | ✅ Shopify webhook | — |
| 1 | (SLA 타이머 만료 시 자동 확인 옵션) | **Operator 버튼** |
| 1A | — | Operator 발주 실행 |
| 1B | — | Operator 발주 정보 입력 |
| 1C | ✅ Scraper CRON 1h | Operator 재확인 가능 |
| 1D | ✅ Scraper 감지 + Alert | **Operator 결정** |
| 1E | ✅ 국내 tracking | — |
| 1F | — | **Warehouse 검수** |
| 1G | ✅ AcrossB → Shopify | Operator 송장 확인 |
| 1H-1I | ✅ AcrossB webhook | — |

### 재발주 의사결정 (1D)

- 기준: **고객이 본 상품판매가 이내**
  - 고객 결제 시 표시된 `listPrice` 또는 `discountPrice` (고객이 인지한 금액)
  - 실제 결제 총액은 +수수료+배송비이지만, 비교 기준은 상품 단가
- 자동 판정 후 Operator는 "재발주 승인" 버튼으로 확정
- 초과 시: Operator가 고객에게 연락 → 동의 얻으면 차액 추가 청구 또는 취소

### SLA 타이머

- Step 1 자동 확인 타이머 (기본 비활성, Admin 설정 가능)
- Step 1B~1C: 발주처 URL 스크레이핑 **1시간 주기 CRON**
- Step 1F: Inspection Response 72h (기존)
- 각 단계별 "체류 시간 경고" (예: 1A 24h 이상 → Ops 대시보드 경고)

---

## Rationale

- 상태 명시적 코드화 → CS·Ops 일관성
- 고객 알림이 우리 vs Shopify 중 어디서 발송되는지 명확히 분리 → 이중 발송·누락 방지
- 1D 분기로 실제 운영에서 빈번한 "취소/품절" 케이스 명시적 처리

### Considered Alternatives

1. **Shopify Order 상태만 사용**: "processing" → "fulfilled"의 단일 축만 있어 중간 단계 미표현. 기각.
2. **자유 텍스트 태그**: 상태를 Tag로만 관리 → 검증·감사 어려움. 기각. (하지만 Tag는 보조로 병행)

---

## Consequences

### Positive

- 운영자/개발자/CS 공통 언어
- 각 단계별 SLA·경고 구축 가능
- 자동화 확장 포인트 명확 (1A-1C-1D-1E-1G 자동화 여지)

### Negative

- Prisma migration 필요 (ProcurementTask 확장)
- 기존 v1의 간단한 주문 상태와 병행 운영 복잡도

### Risks

- 상태 전이 규칙 위반 버그 → unit test + 가드 로직 필수
- 발주처 URL 스크레이핑 실패율 → fallback 수동 입력 창

---

## Implementation

### Data Model 확장

```prisma
model ProcurementTask {
  id                      String   @id @default(uuid())
  orderId                 String
  catalogEntryId          String?
  productId               String
  selectedVariantOptions  Json
  quantity                Int
  status                  ProcurementStatus

  // Step 1B 입력
  sellerUrl               String?               // 발주처 URL
  sellerOrderNumber       String?
  sellerPaymentMethod     String?
  sellerFinalPaidKrw      Int?
  procuredAt              DateTime?

  // Step 1C
  domesticTrackingNumber  String?
  domesticCarrier         String?
  domesticShipStartedAt   DateTime?
  domesticDeliveredAt     DateTime?

  // Step 1D
  failureType             String?              // CANCELLED | OUT_OF_STOCK
  failureDetectedAt       DateTime?
  reprocureApprovedAt     DateTime?

  // Step 1F
  inspectionLevel         String                // BASIC | DETAIL
  inspectionResult        Json?                 // 검수 결과 + 사진
  warehousedAt            DateTime?

  // Step 1G
  intlShipmentId          String?              // AcrossB
  intlTrackingNumber      String?
  intlCarrier             String?
  intlShippedAt           DateTime?

  // SLA
  stepStartedAt           DateTime
  slaDeadline             DateTime?

  @@index([orderId])
  @@index([status, slaDeadline])
}

enum ProcurementStatus {
  ORDER_RECEIVED
  ORDER_CONFIRMED
  PROCUREMENT_IN_PROGRESS
  PROCURED
  DOMESTIC_SHIPPING
  DOMESTIC_DELIVERED
  WAREHOUSED
  INTL_SHIPMENT_CREATED
  INTL_IN_TRANSIT
  DELIVERED
  PROCUREMENT_FAILED
  CANCELLED
}
```

### CRON Jobs

- `scraper-seller-url-sweep` 1h: 1B → 1C 감지 + 1D 분기
- `procurement-sla-warning` 15m: 체류 시간 초과 경고
- `inspection-response-sweep` 10m: 72h 만료

---

## Related

- [Plan: Domestic Procurement Workflow](../../docs/plans/2026-04-19-domestic-procurement-workflow-plan.md)
- [ADR: Cancellation_Return_SLA](2026-04-16_ADR_Cancellation_Return_SLA.md)
- [Ops/CS Admin PRD 06](../master-plan/06_OPERATIONS_CS_ADMIN_PRD.md)
