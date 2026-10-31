# Scrape Queue and ProductTask State Machine

> **Date**: 2026-02-20
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

채팅에서 사용자가 URL을 공유하면 스크래핑이 동기적으로 실행되었다. 스크래핑은 네트워크 상태, 사이트 응답 속도, 3-Tier 캐스케이드(JSON-LD → CSS → LLM) 전체 실행 시 10~60초가 소요된다. 이 시간 동안 채팅 인터페이스가 블로킹되어 사용자는 아무 응답도 받지 못했다. SSE 스트리밍으로 진행 상황을 전달하더라도 결과가 나올 때까지 다른 요청을 처리할 수 없었다.

---

## Decision

스크래핑을 비동기 큐로 분리하고 ProductTask 상태머신으로 진행을 추적한다.

**ProductTask 상태**: `PREVIEW` → `QUEUED` → `PROCESSING` → `EVIDENCE_PARTIAL` → `QUOTE_READY`

- **PREVIEW**: URL 접수 즉시 생성. 채팅은 즉시 preview 카드(상품명, 썸네일 추정)를 반환.
- **QUEUED**: 백그라운드 스크래핑 큐에 등록됨.
- **PROCESSING**: 스크래퍼 서버가 작업 픽업.
- **EVIDENCE_PARTIAL**: 일부 데이터(예: 이미지, 가격) 수집 완료. 클라이언트에 SSE 업데이트 푸시.
- **QUOTE_READY**: 무게·HS코드 포함 완전한 데이터 수집. 견적 생성 가능.

**큐 처리**: CRON 1분 폴링 방식. QUEUED 상태의 ProductTask를 배치로 픽업해 스크래퍼 서버로 위임.

---

## Rationale

비동기 큐 분리로 채팅 UX 응답성을 1초 이내로 확보할 수 있다(preview 카드 즉시 반환). 스크래핑 실패 시 재시도를 큐 레벨에서 처리하므로 채팅 흐름에 영향을 주지 않는다. ProductTask 상태머신으로 데이터 수집 완성도를 단계별로 추적하고, 각 단계에서 클라이언트에 업데이트를 푸시할 수 있다.

### Considered Alternatives

1. **동기 스크래핑 유지 + 타임아웃 단축**: LLM Tier를 스킵하고 1~3초 타임아웃 적용. 빠르지만 데이터 품질 저하, 특히 Coupang·Naver는 JS 렌더링이 필요해 빠른 정적 스크래핑으로는 옵션/무게 추출 불가. 기각.
2. **WebSocket 실시간 스크래핑**: 클라이언트와 WebSocket 연결 유지하며 실시간 진행 상황 전달. SSE보다 복잡하고, 연결 드랍 시 복구 로직 필요. 큐 없이 동기 실행이므로 동시 요청 증가 시 서버 자원 고갈. 기각.

---

## Consequences

### Positive

- 채팅 응답성 1초 이내 (preview 카드 즉시 반환)
- 스크래핑 실패가 채팅 흐름을 중단시키지 않음
- 상태별 업데이트로 사용자가 진행 상황을 실시간으로 확인 가능
- 큐 레벨 재시도로 일시적 스크래퍼 장애 자동 복구

### Negative

- QUOTE_READY까지 수분 소요 가능 — 사용자가 중간에 이탈할 수 있음
- CRON 폴링 1분 지연 — 즉각적인 스크래핑 시작 불가
- ProductTask 엔티티 + 큐 테이블로 DB 복잡도 증가

### Risks

- CRON 장애 시 QUEUED 상태 ProductTask가 무한 대기
- 동시에 너무 많은 ProductTask가 QUEUED되면 처리 지연 심화
- preview 카드의 추정 정보가 QUOTE_READY 최종값과 크게 다를 경우 혼란

---

## Implementation

- `lib/scrape-queue/` — 큐 등록, 픽업, 재시도 로직
- `lib/product-task/` — ProductTask 상태머신, 상태 전이 함수
- `app/api/cron/scrape-queue/route.ts` — 1분 CRON: QUEUED 배치 픽업 → 스크래퍼 서버 위임
- `app/api/events/subscribe/route.ts` — SSE: ProductTask 상태 변경 클라이언트 푸시 (기존 SSE 채널 재사용)

---

## Related

- [Scraper Server Split ADR](./2026-02-12_ADR_Scraper_Server_Split.md)
- [Quote Assurance Gate ADR](./2026-03-08_ADR_Quote_Assurance_Gate.md)
- [Scraper Spec](../Features/Scraper/Spec.md)
- [LLM Agent Spec](../Features/LLM-Agent/Spec.md)
