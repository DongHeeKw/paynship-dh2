# Service Positioning — Payment & Shipping Proxy

> **Date**: 2026-04-16
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted
> **Source**: 공식 정책 문서 (Next Commerce Inc, 2026-03-10 발효)

---

## Context

Pay N Ship을 일반적인 B2C 이커머스 플랫폼으로 오해하면 법적 책임·수수료 구조·분쟁 처리 방식이 모두 어긋난다. 정책 문서는 우리를 **"결제 및 배송 대행자 (Payment & Shipping Proxy)"**로 명시하고, 재고를 보유하지 않으며 상품 품질 보증을 부인한다. UI·약관·CS 응대·개발자 문서 모두 이 포지셔닝을 일관되게 전제해야 한다.

---

## Decision

PayNShip의 서비스 본질을 **"결제 및 배송 대행자 (Proxy)"**로 공식화하고, 다음을 전체 시스템에 반영한다.

1. **법인 정보 공식화**
   - 법인: Next Commerce Inc. (넥스트커머스아이앤씨)
   - DBA: Pay N Ship / K-Buy Agent
   - 준거법: 대한민국, 서울 대한상사중재원
   - DPO: 김도윤 (Doyun Kim, CTO)
   - 문의: privacy@paynship.com
   - 이용약관 발효일: 2026-03-10
2. **지위의 명시**: 상품의 제조·소매·재고 보유자가 아니라 **대리 결제 + 국제 배송 중개**만 수행
3. **보증의 부인**: 상품 품질·지식재산권 비침해·AI 번역 완전성에 대한 보증 부인, 미세 결함은 면책
4. **시스템 오류 취소권**: 기계번역 오류, 환율 지연 등으로 비정상 가격 청구 시 당사가 계약 취소 + 전액 환불할 권리 보유
5. **어뷰징 대응**: Chargeback 부당 신청 시 서비스 영구 차단 권리 (별도 Chargeback Blacklist 시스템과 연동)

### 시스템 반영 지점

- Customer Frontend: footer·legal·checkout 단계에서 "대행 서비스" 명시
- Terms & Privacy: 공식본(`documents/Legal/*`)으로 이관, 기존 draft는 archive
- Admin Dashboard: 상단 법인 표시, Shopify 상점 설정과 동기
- Email 템플릿: "Pay N Ship by Next Commerce Inc." 서명
- API error messages: 과도한 보증 표현 제거

---

## Rationale

- **법적 책임 최소화**: 대행자 지위를 명확히 하면 상품 결함 관련 손해배상 청구를 한국 원판매처로 유도할 수 있음
- **정책 일관성**: 수수료·취소·반품 규정 전부 "대행" 모델을 전제로 작성됨 (DDP 선결제, 출고 전 $5, 반품 $10 등)
- **CS 효율**: 교환·변심 반품 불가라는 기본 방침의 정당성이 "대행자"에서 자연스럽게 도출

### Considered Alternatives

1. **일반 쇼핑몰 포지셔닝**: 고객 신뢰는 높아지나 상품 품질·재고 보증 책임을 떠안아야 함. 대행자 본질과 모순. 기각.
2. **"중개 플랫폼" (Marketplace) 포지셔닝**: Shopify Marketplace 모델. 셀러 직접 접점이 필요한데 우리가 대리결제·대리수취로 처리하므로 부적합. 기각.

---

## Consequences

### Positive

- 약관·수수료·분쟁 처리 전체가 한 프레임으로 일관
- 고객 기대치 관리 (교환 불가, DDP 환불 불가 등이 자연스럽게 설명됨)
- 법무 리스크 축소

### Negative

- 고객 지각 장벽 — "일반 쇼핑몰"을 기대한 유저에 추가 설명 필요
- Marketing copy가 "대행"을 명시해야 하므로 일부 문구 재작성

### Risks

- 해외 고객이 "shopping agent" 개념 이해에 국가별 차이 — FAQ·온보딩 강화 필요
- PG·결제 파트너(PayPal, PortOne)에 대행업 코드로 등록되어야 사기 플래그 감소

---

## Implementation

- Plan: [2026-04-16-policy-integration-plan.md](../../docs/plans/2026-04-16-policy-integration-plan.md)
- Legal migration: `documents/Legal/*` (공식본) vs `documents/Reference/Legal/_archive/*` (구 draft)
- Affected: 모든 Customer-facing UI 카피, 이용약관, Privacy, Admin 법인 표기, Email 서명

---

## Related

- [ADR: Landed_Cost_And_Fees](2026-04-16_ADR_Landed_Cost_And_Fees.md)
- [ADR: Cancellation_Return_SLA](2026-04-16_ADR_Cancellation_Return_SLA.md)
- 원본 정책: `docs/external-inputs/2026-04-15-policies/terms/2. Terms and conditions 문서.md`
