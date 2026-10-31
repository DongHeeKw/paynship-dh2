# Cancellation & Return SLA — Strict Timers + Abandonment Rights

> **Date**: 2026-04-16
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

국제 배송대행의 특성상 시간 경과에 따라 회수 불가능·손실 확대 리스크가 기하급수적으로 커진다. 정책 문서는 **Business Days**와 **Calendar Days**를 엄격히 구분하고, 도착지 관세 분쟁 시 **Abandonment Right(임의 폐기권)**을 명시한다. 이를 시스템에 코드화하지 않으면 CS가 케이스마다 임의 판단해야 하므로 일관성이 무너진다.

---

## Decision

### 1. 엄격 SLA 타이머

| 이벤트 | 기한 | 기준 |
|--------|------|------|
| **반품 접수 (Return Request)** | 수령 후 **5 영업일** | Business Days (한국 기준, 주말·공휴일 제외) |
| **반품 발송 (Return Ship)** | 반품 승인 후 **7일** | Calendar Days |
| **반품 도착 (Return Arrive)** | 발송 후 **14일** | Calendar Days |
| **Detail 검수 문제 응답** | 통보 후 **72시간** | Calendar Hours |

- 각 기한은 DB에 `expiresAt` 필드로 영속 저장 (`return_requested_deadline`, `return_ship_deadline`, `return_arrive_deadline`, `inspection_response_deadline`)
- 기한 초과 시 자동 상태 전환:
  - 반품 접수 미접수 → 반품 접수 거절
  - 반품 발송 기한 초과 → 반품 승인 자동 철회 + Order 확정
  - 반품 도착 기한 초과 → 반품 거부 + Order 확정
  - Inspection 응답 무응답 → **하자 반품 자동 진행 + $10 차감 환불** (정책 변경 반영)

### 2. 반품 불가 정책 (정책 문서 명시)

- **단순 변심 반품**: 전면 불가
- **사이즈/색상 교환**: 전면 불가
- **하자 반품만 허용** (언박싱 영상 증빙 필수)
- 승인은 **100% 관리자 수동 검토** — 자동 승인 없음

### 3. Detail 검수 응답 플로우 (신규)

```
Detail Inspection에서 문제 발견
  │
  ▼
고객에게 알림 (이메일 + 인앱)
  내용: 발견 사항 + 사진 + 선택지 3개
    a) 그대로 발송
    b) 교환 대행 요청 (셀러에 무상 교환)
    c) 환불 (셀러 반품)
  응답 기한: 72시간
  │
  ▼
72h 이내 응답 없음
  │
  ▼
기본 정책: "하자 반품 처리 + 환불"
  - Order status = RETURN_INITIATED
  - 셀러에 반품 요청
  - 환불 = 결제액 - DDP 기납부 세금 - $10 수수료
```

### 4. Abandonment Rights (임의 폐기권)

**적용 조건**: 도착지 세관이 추가 관세 부과 + 고객 납부 거부 → 수취 거부 발생

**판정 공식** (A-3): `현지 반송비 + 한국 재검수비 + 셀러 반환비 > 상품가 × 1.0`

**판정 주체** (B-2): **시스템 추천 + 관리자 최종 승인**

**고객 알림 순서** (C-2):
```
세관 이슈 감지 (webhook 또는 Ops 수동 입력)
  │
  ▼
시스템 자동 계산 → Admin 큐에 추천값 노출
  │
  ▼
고객에게 48h 유예 통보 (이메일 + SMS)
  선택지 3개:
    a) 추가 관세 직접 납부
    b) 반송 비용 부담하여 한국으로 반품
    c) 폐기 동의
  │
  ▼
48h 무응답 or (b)(c) 선택
  │
  ▼
Admin이 추천값 검토 후 폐기 결정 승인
  │
  ▼
현지 세관/특송사에 Abandonment 지시
  AbandonmentLog 기록:
    - orderId, cause, costEstimate, customerChoice, approvedBy, approvedAt
  │
  ▼
고객 환불: 없음 (정책상)
```

**Admin Settings 조정값**:
- 고객 유예 시간 (기본 48h)
- 한국 재검수비 고정값 (기본 KRW 5,000)
- 셀러 반환비 기본값 (기본 KRW 10,000)
- 임계치 계수 (기본 1.0)

### 5. 신규 데이터 모델

```prisma
model ReturnRequest {
  id                      String   @id @default(uuid())
  orderId                 String
  requestedAt             DateTime
  approvedAt              DateTime?
  rejectedAt              DateTime?
  shippingDeadline        DateTime  // approved + 7 days
  arrivalDeadline         DateTime  // approved + 14 days (from actual ship)
  unboxingVideoUrl        String
  reason                  String
  internalRuling          String?   // DEFECT | ABUSE | WEAR | ... manager 수동
  refundAmountUsd         Float?
  createdAt               DateTime @default(now())

  @@index([orderId])
  @@index([shippingDeadline])
  @@index([arrivalDeadline])
}

model InspectionResponse {
  id                      String   @id @default(uuid())
  orderId                 String
  findings                Json      // 검수팀이 입력한 이상 내역
  notifiedAt              DateTime
  responseDeadline        DateTime  // notifiedAt + 72h
  customerChoice          String?   // SHIP_AS_IS | EXCHANGE | REFUND
  respondedAt             DateTime?
  defaultApplied          Boolean   @default(false)

  @@index([responseDeadline, respondedAt])
}

model AbandonmentLog {
  id                      String   @id @default(uuid())
  orderId                 String   @unique
  detectedAt              DateTime
  customerNotifiedAt      DateTime
  customerChoice          String?   // PAY_EXTRA | RETURN_TO_KR | ABANDON | null(timeout)
  reshipCostUsd           Float
  reinspectionFeeKrw      Int
  sellerReturnFeeKrw      Int
  productValueKrw         Int
  systemRecommendation    String   // ABANDON | RETURN
  approvedBy              String?
  approvedAt              DateTime?
  finalDecision           String   // ABANDON | RETURN
  executedAt              DateTime?
}
```

---

## Rationale

- **기한 코드화 = 분쟁 축소**: CS가 개별 판단할 여지를 없애 일관된 정책 적용
- **72h Inspection 응답 + 기본값 환불**: 고객 연락두절 시에도 재고 회전을 지연하지 않음
- **Abandonment 임계치 공식화**: 케이스별 손실을 데이터 기반으로 결정, 기록 남김
- **자동 환불 없음**: 정책 상 모든 반품이 관리자 검토 → 증빙 품질 유지 + 악의적 청구 차단

### Considered Alternatives

1. **자동 반품 승인 (AI 언박싱 판독)**: 위조 영상 리스크, 초기 데이터 부족. 기각 (장기 과제).
2. **Abandonment 완전 자동**: 임계치 명확해도 고객 불만 감수해야 → B-2 유지.
3. **Inspection 무응답 시 그대로 발송**: 하자 있는 상품 발송 후 반품 비용 발생 → 경제성 낮음. 기각.

---

## Consequences

### Positive

- CS 응대 표준화, 분쟁 기록 일관성
- Abandonment 결정 투명성 (AbandonmentLog)
- Inspection 응답 자동 진행으로 창고 회전율 유지

### Negative

- 타이머 CRON 추가 (`sla-timer-sweep`)
- 고객이 기한 인지 못 할 시 불만 → 알림 강화 (이메일 + 인앱 + SMS)
- 72h 기본값 환불 정책에 대한 고객 사전 동의 필요 (Checkout 시 약관 체크)

### Risks

- 공휴일 캘린더 관리 누락 → Business Days 계산 오차 → 명확한 KR holiday 라이브러리 사용
- Detail Inspection 문제 통보 알림 전달 실패 → 72h 타이머를 "전달 확인된 시점부터" 시작

---

## Implementation

- Plan: [2026-04-16-policy-integration-plan.md](../../docs/plans/2026-04-16-policy-integration-plan.md)
- New CRON: `sla-timer-sweep` (10분 주기)
- Affected: Order-Checkout/Spec, Shopify Tags 전환 규칙, Admin/Ops PRD, Customer FE 알림

---

## Related

- [ADR: Payment_Proxy_Service_Positioning](2026-04-16_ADR_Payment_Proxy_Service_Positioning.md)
- [ADR: Landed_Cost_And_Fees](2026-04-16_ADR_Landed_Cost_And_Fees.md)
- [ADR: Consolidation_Compliance](2026-04-15_ADR_Consolidation_Compliance.md)
- 원본 정책: `docs/external-inputs/2026-04-15-policies/terms/5. Return and refund 정책.md`
