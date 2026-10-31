# Order Intake Pipeline

> **Date**: 2026-03-08
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

초기 설계에서는 견적(Quote) 생성 즉시 결제 단계로 넘어갈 수 있었다. 이 구조에서는 Quote Assurance Gate가 Amber 또는 Red 판정을 내려도 결제를 바로 진행할 수 있어 품질 게이트의 실효성이 없었다. 또한 운영자가 이상 견적을 검토하거나 재견적을 요청할 수 있는 레이어가 존재하지 않았다. 잘못된 견적으로 결제가 완료되면 환불 처리 비용이 더 크다.

---

## Decision

견적에서 결제 사이에 OrderIntent 검토 레이어를 삽입한다.

**파이프라인**: `Quote` → `OrderIntent` → `PaymentRequest` → `Order`

- **OrderIntent**: 견적이 생성되면 OrderIntent가 자동 생성됨. 품질 게이트 결과에 따라 상태 결정:
  - Green → `AUTO_ACCEPTED`: 결제 요청 자동 생성
  - Amber → `PENDING_REVIEW`: 운영자 검토 대기, 고객에게 "검토 중" 안내
  - Red → `PENDING_REVIEW`: 운영자 재견적 또는 차단 처리
- **PaymentRequest**: 운영자 승인(또는 Auto Accept) 후 생성. 고객에게 결제 링크 발송.
- **Order**: 결제 완료 후 생성. 이후 상태머신이 주문 흐름을 관리.

---

## Rationale

결제 전에 검토 레이어를 두면 품질이 낮은 견적이 결제로 이어지는 경우를 차단할 수 있다. Green 자동수락으로 데이터가 완전한 경우 UX 지연 없이 처리하고, Amber/Red만 수동 검토하여 운영 부담을 최소화한다. 재견적(re-quote) 기회를 제공해 정확한 가격으로 다시 시작할 수 있다.

### Considered Alternatives

1. **모든 견적 자동 승인**: 운영 부담이 없고 UX가 빠르나, 잘못된 견적 결제 시 환불·CS 비용이 크고 Phase 2 분쟁 위험. 기각.
2. **모든 견적 수동 검토**: 데이터 품질 완전 보장 가능하나 처리 지연이 고객 이탈 유발. 운영팀 규모 확장 전까지 지속 불가. 기각.

---

## Consequences

### Positive

- 결제 전 품질 검증으로 환불·분쟁 비용 절감
- 운영자가 이상 견적에 개입할 수 있는 공식 채널 확보
- 재견적 플로우로 데이터 보강 후 정확한 가격 제시 가능

### Negative

- Green이 아닌 경우 결제까지 지연 발생 (Amber: 수 시간, Red: 수동 처리)
- OrderIntent, PaymentRequest 엔티티 추가로 DB 스키마 복잡도 증가
- 운영자 대시보드에 새 검토 UI 필요

### Risks

- PENDING_REVIEW 상태가 쌓이면 운영자 처리 지연으로 병목 발생
- Auto Accept 조건(Green) 임계값이 너무 낮으면 실효성 없고, 너무 높으면 모두 수동 검토로 몰림

---

## Implementation

- `lib/order-intake/` — OrderIntent 생성, 상태 전이 로직, Auto Accept 판단
- `app/api/order-intents/route.ts` — 고객용 OrderIntent 생성/조회 API
- `app/api/order-intents/[id]/route.ts` — 개별 OrderIntent 상태 조회
- `app/api/admin/order-intents/route.ts` — 운영자용 검토·승인·기각 API
- `app/api/admin/order-intents/[id]/approve/route.ts` — 승인 → PaymentRequest 생성

---

## Related

- [Quote Assurance Gate ADR](./2026-03-08_ADR_Quote_Assurance_Gate.md)
- [Two-Phase Payment ADR](./2026-04-01_ADR_Two_Phase_Payment.md)
- [Order State Machine ADR](./2026-04-01_ADR_Order_State_Machine.md)
- [Order-Checkout Spec](../Features/Order-Checkout/Spec.md)
