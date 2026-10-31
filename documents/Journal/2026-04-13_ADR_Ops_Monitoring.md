# Ops Monitoring and Alerting

> **Date**: 2026-04-13
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

프로덕션 운영 중 발생하는 결제 실패, 환율 급변, stuck 주문, 스크래퍼 장애 등 이벤트에 대한 가시성이 전혀 없었다. 문제를 발견하는 방법은 고객 CS 문의뿐이었다. 스크래퍼 circuit breaker가 열려도 내부적으로만 기록되고 외부에 알림이 없었으며, CRON 작업 실패도 조용히 넘어갔다. 환율이 급변하면 이미 생성된 Phase 1 견적과 Phase 2 실비용 사이의 차이가 커질 수 있는데 이를 감지할 방법이 없었다.

---

## Decision

Slack Webhook 기반 ops alerting 시스템을 도입한다.

**8종 알림 이벤트**:
1. `new_order` — 새 주문 접수 (결제 완료)
2. `payment_failed` — 결제 실패 (Phase 1 또는 Phase 2)
3. `circuit_breaker_tripped` — 스크래퍼 circuit breaker OPEN 상태 진입
4. `phase2_overdue` — Phase 2 청구 후 7일 미결 주문
5. `exchange_rate_drift` — 환율 3% 이상 변동 감지
6. `cron_failure` — CRON 작업 실패 (scrape-queue, phase2-expiry 등)
7. `scraper_down` — 스크래퍼 서버 헬스체크 실패
8. `stuck_order` — 48시간 이상 상태 변화 없는 주문

**환율 모니터링 (4시간 CRON)**:
- 3% 변동 시: `exchange_rate_drift` Slack 알림, 운영자 수동 대응
- 5% 변동 시: `exchange_rate_drift` 알림 + 영향받는 PENDING_PHASE2 주문 자동 재견적 트리거

**CRON 보안**: 모든 CRON 엔드포인트에 `CRON_SECRET` 헤더 검증 적용. 미설정 시 default-deny (401 반환). Vercel Cron이 자동으로 헤더를 첨부하도록 구성.

---

## Rationale

문제를 고객이 먼저 발견하기 전에 운영팀이 인지해야 한다. Slack은 팀이 이미 사용하는 채널이므로 별도 모니터링 대시보드 없이 즉시 알림 수신 가능. 환율 5% 임계값에서의 자동 재견적은 Phase 2 분쟁을 예방하고, 3% 임계값의 수동 알림은 운영자 판단을 개입시킬 여지를 준다. CRON_SECRET default-deny는 공개 CRON 엔드포인트를 통한 임의 실행을 차단한다.

### Considered Alternatives

1. **외부 모니터링 서비스(Datadog, PagerDuty)**: 완전한 APM 기능 제공하나 월 수백 달러 비용 + 통합 공수. 현재 단계의 트래픽 규모에 과도함. 기각.
2. **이메일 알림**: Slack보다 지연되고 팀 채널 중심 협업에 적합하지 않음. 기각.

---

## Consequences

### Positive

- 운영 이벤트를 고객 CS보다 먼저 인지하는 조기 감지 체계
- 환율 급변 시 자동 재견적으로 Phase 2 분쟁 사전 차단
- CRON_SECRET으로 CRON 엔드포인트 무단 실행 방지
- Slack 채널별 분리 가능 (예: #ops-alerts, #payments)

### Negative

- Slack Webhook URL이 노출되면 스팸 알림 가능 → Secret Manager 보관 필요
- 알림이 너무 많으면 무시하게 되는 alert fatigue 발생 가능
- 자동 재견적이 고객에게 예고 없이 금액을 변경하면 혼란 유발 가능

### Risks

- 환율 모니터 CRON 자체가 장애나면 `cron_failure` 알림이 없어 무감지 구간 발생
- 재견적 자동화 버그로 모든 PENDING_PHASE2 주문에 잘못된 금액이 적용될 수 있음
- stuck_order 감지 기준(48시간)이 정상적인 국제배송 지연과 겹칠 수 있음

---

## Implementation

- `lib/ops/alerting.ts` — Slack Webhook 발송, 8종 이벤트 포매터, 재시도 로직
- `lib/calculator/exchange-rate-monitor.ts` — 환율 변동 감지, 3%/5% 임계값, 재견적 트리거
- `app/api/cron/exchange-rate-monitor/route.ts` — 4시간 CRON: 환율 조회 및 알림/재견적
- 기존 CRON 엔드포인트에 `CRON_SECRET` 검증 미들웨어 추가

---

## Related

- [Two-Phase Payment ADR](./2026-04-01_ADR_Two_Phase_Payment.md)
- [Scrape Queue ADR](./2026-02-20_ADR_Scrape_Queue_Product_Task.md)
- [Scraper Server Split ADR](./2026-02-12_ADR_Scraper_Server_Split.md)
- [Calculator Spec](../Features/Calculator/Spec.md)
