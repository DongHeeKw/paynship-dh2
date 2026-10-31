# Two-Phase Payment Architecture

> **Date**: 2026-04-01
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

단일결제(Single-Phase) 모델로는 실제 배송비를 정확히 청구할 수 없다. 국제배송에서 배송비는 창고 계측(실무게 vs 부피무게) 후에야 확정되며, 통관 단계에서 관세와 세금이 추가된다. 말테일, 오마이집 등 업계 표준 배송대행 서비스도 동일한 이유로 2-Phase 결제를 채택하고 있다. 단일결제 시 두 가지 문제가 발생한다: 추정 배송비로 과소/과대 청구되거나, 관세·세금을 포함한 전액을 선불로 요구하면 고객 이탈률이 높아진다.

---

## Decision

결제를 두 단계로 분리한다.

- **Phase 1**: 상품가 + PayNShip 수수료 + 추정 배송비(카테고리 기반 무게 추정). 주문 시점에 즉시 청구.
- **Phase 2**: 실측 배송비 + 관세 + 세금 - Phase 1 배송비 선납분. 창고 계측 완료 후 청구.
- **경량 아이템 예외**: 실측 무게 < 0.5kg인 경우 Phase 2 추가 청구 없이 Phase 1로 완결. 경량 오차가 운영비용을 초과하지 않는다고 판단.
- Phase 2 미결 주문은 7일 후 자동 만료(CRON).

---

## Rationale

고객 신뢰를 위해 정확한 가격을 제시해야 하며, 무게 불확실성으로 인해 Phase 1에서 정확한 배송비 청구가 불가능하다. 2-Phase는 "일단 상품을 확보하고, 정확한 비용이 확정된 후 추가 청구"라는 투명한 흐름을 제공한다. 업계 선례도 충분하다.

### Considered Alternatives

1. **고정 배송비 단일결제**: 카테고리별 평균 배송비를 선불로 청구. 구현이 단순하지만 실제 비용과 차이가 크면 회사 손실 또는 고객 불만이 발생. 기각.
2. **전액 후불(Deferred Full Payment)**: 창고 계측 완료 후 전액 청구. 고객 이탈률이 극히 높고 상품 구매 전 보증금 없이 재고를 선점해야 하는 운영 리스크 존재. 기각.

---

## Consequences

### Positive

- 정확한 최종 비용 제공으로 고객 신뢰 향상
- 운영자가 실측 무게를 입력할 시간 확보
- 경량 아이템 패스트트랙으로 운영 효율화

### Negative

- 주문 상태 7개 추가 (PENDING_PHASE2, PHASE2_INVOICED, PHASE2_PAID 등 포함)
- 고객에게 2번의 결제 경험 요구 — UX 마찰 증가
- Phase 2 알림 시스템(이메일/SMS) 구축 필요

### Risks

- Phase 2 만료 CRON 장애 시 zombie 주문 발생
- 환율 변동이 Phase 1과 Phase 2 사이에 발생할 경우 가격 불일치
- 고객이 Phase 2 결제를 거부하는 경우 분쟁 처리 프로세스 필요

---

## Implementation

- `app/api/admin/orders/[id]/warehouse/route.ts` — 창고 실측 무게 입력 엔드포인트
- `app/api/admin/orders/[id]/request-phase2/route.ts` — Phase 2 청구 요청 트리거
- `app/api/cron/phase2-expiry/route.ts` — 7일 만료 CRON 처리
- 주문 상태머신 확장: `lib/orders/state-machine.ts`

---

## Related

- [Order State Machine ADR](./2026-04-01_ADR_Order_State_Machine.md)
- [Order Intake Pipeline ADR](./2026-03-08_ADR_Order_Intake_Pipeline.md)
- [Order-Checkout Spec](../Features/Order-Checkout/Spec.md)
