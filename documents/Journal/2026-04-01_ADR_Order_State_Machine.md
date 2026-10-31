# Order State Machine

> **Date**: 2026-04-01
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

초기 구현에서 주문 상태(order status)는 자유 문자열(free-form string)로 관리되었다. 코드 어디서나 임의의 상태값을 직접 쓸 수 있어 잘못된 상태 전이(예: DELIVERED → PENDING_PAYMENT)가 런타임에 발생할 수 있었다. 특히 Shopify Webhook이 외부에서 상태를 변경하는 경우 데이터 무결성 위반 가능성이 높았고, 디버깅 시 실제 상태 흐름을 추적하기 어려웠다.

---

## Decision

14개의 명시적 상태 + 4개의 레거시 호환 상태로 구성된 유한 상태머신(FSM)을 도입한다.

**상태 목록**: `DRAFT` → `PENDING_PAYMENT` → `PAYMENT_RECEIVED` → `PURCHASING` → `PURCHASED` → `SHIPPED_TO_WAREHOUSE` → `AT_WAREHOUSE` → `PENDING_PHASE2` → `PHASE2_INVOICED` → `PHASE2_PAID` → `SHIPPED_INTERNATIONAL` → `CUSTOMS_CLEARANCE` → `OUT_FOR_DELIVERY` → `DELIVERED`

**전이 규칙**: 모든 상태 변경은 `validateOrderTransition(from, to)` 를 반드시 통과해야 한다. 허용되지 않은 전이 시 `InvalidTransitionError` 를 throw한다.

**Webhook 처리**: Shopify Webhook에서 상태 전이 실패 시 예외를 throw하지 않고 skip + warn 로깅. 외부 이벤트로 인한 서비스 장애를 방지한다.

---

## Rationale

자유 문자열 상태는 컴파일 타임에 오류를 잡을 수 없고, 팀이 성장하면서 허용 가능한 전이가 어디인지 추적하기 어려워진다. FSM은 상태 전이를 명시화하고, 잘못된 전이를 시스템 레벨에서 차단한다. 디버깅 시 상태 이력(transition log)만 보면 주문 흐름 전체를 파악할 수 있다.

### Considered Alternatives

1. **자유 전이 유지**: 현재 상태 유지. 개발 속도는 빠르지만 데이터 무결성 보장 불가, 잘못된 전이로 인한 부분 환불·중복 처리 등 운영 사고 위험 상존. 기각.
2. **이벤트 소싱(Event Sourcing)**: 모든 상태 변경을 이벤트 로그로 관리. 완전한 감사 추적 가능하지만 현재 팀 규모와 트래픽에 비해 과도한 복잡성(CQRS 패턴, 이벤트 스토어 인프라). 기각.

---

## Consequences

### Positive

- 컴파일 타임 + 런타임 이중 안전망으로 잘못된 상태 전이 원천 차단
- 상태 전이 규칙이 코드에 명시되어 온보딩 및 디버깅 용이
- Webhook 방어 처리(skip+warn)로 외부 이벤트에 대한 견고성 확보

### Negative

- 새 상태 추가 시 전이 테이블도 함께 업데이트 필요 — 변경 비용 증가
- 레거시 데이터의 상태값이 FSM 외부인 경우 마이그레이션 필요

### Risks

- 전이 테이블 업데이트 누락 시 정상 전이가 차단되는 false-block 발생 가능
- Webhook skip 정책이 남용되면 실제 오류를 무시하는 패턴으로 굳어질 수 있음

---

## Implementation

- `lib/orders/state-machine.ts` — FSM 정의, `validateOrderTransition()`, `InvalidTransitionError`
- `lib/shopify/webhooks.ts` — Webhook 핸들러에서 FSM 적용, skip+warn 패턴
- 상태 전이 이력 테이블: `OrderTransitionLog` (Prisma 스키마 추가 예정)

---

## Related

- [Two-Phase Payment ADR](./2026-04-01_ADR_Two_Phase_Payment.md)
- [Order-Checkout Spec](../Features/Order-Checkout/Spec.md)
- [Shopify Integration Spec](../Features/Shopify-Integration/Spec.md)
