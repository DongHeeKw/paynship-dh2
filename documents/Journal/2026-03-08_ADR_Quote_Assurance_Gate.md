# Quote Assurance Gate

> **Date**: 2026-03-08
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

스크래핑으로 수집한 상품 데이터에는 무게(weight)와 HS 코드(관세 분류)가 누락되거나 신뢰도가 낮은 경우가 빈번하다. 이 상태에서 그대로 견적(Quote)을 생성하면 Phase 1 금액과 Phase 2 실비용 사이에 큰 차이가 생긴다. 특히 관세율이 높은 카테고리(화장품, 식품 등)에서 무게 오추정은 수십 달러 수준의 오차를 낳는다. 고객이 Phase 2에서 예상보다 훨씬 큰 추가 청구를 받으면 신뢰가 붕괴된다.

---

## Decision

견적 생성 전 데이터 품질을 3단계로 평가하는 Quote Assurance Gate를 도입한다.

- **Green**: 무게·HS 코드 모두 고신뢰도 → 즉시 checkout 허용
- **Amber**: 추정값 사용 중 또는 신뢰도 중간 → 운영자 검토 플래그, 고객에게 경고 표시 후 진행 가능
- **Red**: 핵심 데이터 누락 또는 신뢰도 임계값 미달 → 추가 보강 없이 checkout 차단

데이터 보강(enrichment)은 순서대로 시도한다:
1. **Tavily 웹 검색**: 상품명 + 브랜드로 공개 정보 보강
2. **GTIN/바코드 조회**: 국제 상품 데이터베이스
3. **UNI-PASS API**: 한국 관세청 HS 코드 조회
4. **카테고리 폴백**: 카테고리 기반 평균값 사용(Amber 처리)

---

## Rationale

Phase 2에서 대규모 추가 청구가 발생하면 환불 요청, CS 비용, 브랜드 훼손으로 이어진다. 결제 전 데이터 품질을 검증하는 게이트를 두면 이 문제를 조기에 차단할 수 있다. 완전 차단(Red)과 경고 통과(Amber)를 분리해 운영 유연성을 유지한다.

### Considered Alternatives

1. **게이트 없이 항상 추정값 사용**: 구현이 단순하나 부정확한 견적이 그대로 결제로 이어짐. 고객 신뢰 손상 및 Phase 2 분쟁 위험. 기각.
2. **항상 수동 검토 요구**: 모든 견적을 운영자가 검토 후 승인. 데이터 품질은 보장되나 처리 지연으로 UX 저하, 운영 부담 급증. 기각.

---

## Consequences

### Positive

- 부정확한 견적으로 인한 Phase 2 대규모 추가 청구 사전 차단
- Green 자동 통과로 데이터 완전한 경우 UX 무중단
- 데이터 보강 파이프라인이 스크래퍼 신뢰도를 누적 개선하는 피드백 루프

### Negative

- 보강 파이프라인(Tavily, GTIN, UNI-PASS) 각각 레이턴시 추가
- 외부 API(UNI-PASS, GTIN) 장애 시 Red 게이트 false-block 가능성
- Amber/Red 판정 기준 임계값 튜닝에 초기 운영 데이터 필요

### Risks

- UNI-PASS API가 모든 한국 수출 상품을 커버하지 못할 수 있음
- 카테고리 폴백 평균값이 Amber로 처리되나 실제로는 큰 오차를 가질 수 있음

---

## Implementation

- `lib/quote-assurance.ts` — 3단계 게이트 로직, 신뢰도 스코어 계산
- `lib/enrichment/tavily-enricher.ts` — Tavily 웹 검색 보강
- `lib/enrichment/gtin-lookup.ts` — GTIN/바코드 국제 DB 조회
- `lib/enrichment/unipass-lookup.ts` — 한국 관세청 HS 코드 조회

---

## Related

- [Order Intake Pipeline ADR](./2026-03-08_ADR_Order_Intake_Pipeline.md)
- [Two-Phase Payment ADR](./2026-04-01_ADR_Two_Phase_Payment.md)
- [Scraper Spec](../Features/Scraper/Spec.md)
- [Calculator Spec](../Features/Calculator/Spec.md)
