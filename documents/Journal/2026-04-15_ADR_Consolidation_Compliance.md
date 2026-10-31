# Consolidation Compliance Engine

> **Date**: 2026-04-15
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

2026-04-15 수행한 [HS Code 합배송 통관 규정 딥리서치](../Reference/Research/2026-04-15_HS_Code_Consolidation_Customs_Research.md)에서 다음이 확인되었다.

- HS Code 혼재 합배송은 한국·도착국·캐리어 모두 **법적으로 허용** (물리 분리 불요)
- 다만 commercial invoice 라인 단위 완전 분리가 필수 (라인 뭉뚱그리기 금지)
- **DG(위험물)·검역 대상(식품·화장품·의약품)은 물리적 박스 분리 의무** (IATA/위생)
- FTA 원산지는 라인별 조건부 기재 필수 — 포괄 문구는 박스 전체 FTA 박탈 리스크
- **2026년 규제 3개**: US Section 321 전면 중단(02월), EU €3/heading(07월), CA CARM per-line(진행)
- 저가신고(Undervaluation)는 관세청 중점 단속 대상

이 규제 지형에서 합배송 자동화는 개별 기능 수준으로 흩어 놓으면 누락이 불가피하다. 단일 엔진으로 묶어야 한다.

---

## Decision

**Consolidation Compliance Engine**을 신규 모듈로 도입하고 5가지 운영 규칙을 시스템 차원에서 강제한다.

1. **Invoice 라인 자동 분리 + 다원산지 매핑**: Cart/Quote/Order 단계에서 라인 단위 `{hsCode, origin, description, unitPrice, quantity}` 유지. 캐리어 API에 Multi-line EDI로 송출
2. **2026 동적 Duty Calculator 내장**: 국가별 규칙 테이블(US no-de-minimis / EU €3×heading / JP ¥10,000 per parcel / CA per-line / AU per-consignment)을 Shopify 계산값 위에 Verification Hook으로 얹는다
3. **스마트 격리 알고리즘**: 상품 카탈로그에 `dgClass`, `inspectionRequired` 플래그 — Cart에 혼재 감지 시 박스 자동 분할 안내 강제
4. **조건부 FTA 원산지 렌더링**: invoice PDF에서 `origin=KR` 라인만 FTA 증명 문구 출력. 포괄 문구 시스템적 차단
5. **저가신고 모니터링 Lock**: 시장가 anomaly 탐지 시 라벨 자동출력 중지 + Admin Pending 큐

---

## Rationale

- 규제 지형이 수시 변동 → 개별 feature 수준 분산 구현은 누락·차이 발생
- 엔진 단일화로 `ComplianceEvaluation` 단일 책임: cart snapshot을 입력하면 `{valid, splitRequired, ftaEligibleLines, invoiceLines, anomalies}` 반환
- 통관 실패는 직접 비용(지연·반송·벌금)뿐 아니라 고객 신뢰 타격

### Considered Alternatives

1. **Shopify Functions로 checkout에서만 검증**: Cart 단계 견적·분할 안내가 불가능해 UX 저하. 기각.
2. **수동 검수 중심 운영**: 초기 소규모엔 가능하나 스케일 불가. 기각.

---

## Consequences

### Positive

- 규제 준수 단일 지점 → 감사·변경 용이
- DG/검역 자동 분할로 공항 Off-load·통관 Hold 리스크 선제 차단
- 저가신고 자동 탐지로 관세청 단속 대응

### Negative

- 신규 모듈(엔진 + 규칙 테이블) 도입 복잡도
- 박스 자동 분할이 고객 UX에 개입 → 명확한 안내 카피 필요
- 저가신고 Pending이 정상 주문을 과도하게 막으면 CS 부담

### Risks

- 국가별 규칙 테이블 업데이트 누락 → 월간 점검 프로세스 필수
- LLM 기반 카테고리 → DG 플래그 추론의 오탐/미탐 → 수동 우선 큐 병행
- FTA 렌더링 버그는 박스 전체 FTA 박탈 → 라인별 렌더링 단위 테스트 필수

---

## Implementation

- Plan: [2026-04-15-consolidation-compliance-engine-plan.md](../../docs/plans/2026-04-15-consolidation-compliance-engine-plan.md)
- Research: [2026-04-15_HS_Code_Consolidation_Customs_Research.md](../Reference/Research/2026-04-15_HS_Code_Consolidation_Customs_Research.md)
- Affected: Cart/Spec, Calculator/Spec, Order-Checkout/Spec, Shopify-Integration/Fulfillment-Spec

---

## Related

- [ADR: Shopify_As_Shipping_Backend](2026-04-15_ADR_Shopify_As_Shipping_Backend.md)
- [ADR: Cart_Trigger_Shopify_Product](2026-04-15_ADR_Cart_Trigger_Shopify_Product.md)
