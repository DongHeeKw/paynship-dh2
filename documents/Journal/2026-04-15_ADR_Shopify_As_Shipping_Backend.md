# Shopify as Shipping & Duty Backend

> **Date**: 2026-04-15
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

자체 Calculator에서 환율·배송비·HS Code·관세 로직을 직접 구현·관리해 왔다. 2026년 미국 Section 321 전면 중단, EU €3/tariff heading 시행 등 국가별 규제 변동이 잦아지면서 자체 유지의 운영 비용과 오류 리스크가 급증한다. 동시에 Shopify Admin API의 `draftOrderCalculate`와 Managed Markets는 배송비·관세·세금을 **입력(line items + shipping address + package) → 결과** 형태로 제공하며, 금액 보증(guaranteed duties) 기능까지 포함한다. PayNShip이 사실상 Shopify 백엔드 기반으로 장바구니·박스·발송을 운영하게 된 만큼, 계산도 위임하는 쪽이 복잡도·리스크 모두 낮다.

---

## Decision

**Shopify가 배송비·관세·세금 계산을 수행하고, PayNShip은 결과를 수신해 10% 서비스 수수료를 가산해 표시한다.**

1. Cart에 상품이 추가되면 Shopify Product/Variant를 자동 생성(72h TTL)
2. 박스 마스터는 Shopify Custom Shipping Package에 등록(`shippingPackageUpdate`), 로컬 DB에 미러링
3. 견적 계산 시 `draftOrderCalculate` 호출 → `{subtotal, shipping, duties, tax, total}` 수신
4. 서비스 수수료(10%)는 Shopify가 모르는 도메인이므로 PayNShip 백엔드에서 `(A+B) × 10%`로 가산
5. **EU Verification Hook** 별도 구현: 2026-07-01 이후 EU 발송 건에 대해 `€3 × distinct tariff headings` 규칙으로 재계산 후 Shopify 값과 비교, 불일치 시 admin alert

### 부피무게

Shopify 박스 객체에 volumetric weight 필드가 없으므로 우리 쪽에서 `(W × D × H) / 5000` kg 로 환산해 Variant의 `grams`/`weight`에 덮어써 전달.

---

## Rationale

- 국가별 규제 변동을 Shopify가 대응 → 우리 유지보수 부담 소멸
- Managed Markets의 금액 보증으로 환차 리스크 헤지
- Calculator 코드 대부분 삭제 가능 (단순화)
- EU 신규 규칙은 Shopify 공식 대응이 확인되지 않아 Verification Hook으로 안전장치 확보

### Considered Alternatives

1. **자체 Calculator 유지 + 규칙 테이블**: 국가별 HS/세율/Threshold 수동 업데이트 부담 지속, 규제 변동 시 장애 발생 리스크 상존. 기각.
2. **Zonos 등 3rd-party Duty 앱만 사용**: 별도 비용 + Shopify 외부 통합 복잡도. 일단 Shopify 기본으로 시작하고 Zonos는 EU 건 대안으로 보류. 기각.

---

## Consequences

### Positive

- 배송비·관세 계산 유지보수 부담 대폭 감소
- 규제 변동에 대한 Shopify 위임 → 내부 장애 리스크 ↓
- Calculator 코드 간소화, 테스트 범위 축소

### Negative

- Shopify API 호출 레이턴시가 최종 견적 응답 시간에 직결 (~500ms~2s)
- Shopify 장애 시 견적 불가 → 캐시 전략 필요
- EU 규칙 대응 여부를 수시 검증해야 함

### Risks

- Shopify가 EU 2026-07 €3/heading 규칙을 제때 지원하지 않을 경우 → Verification Hook + Zonos 대체안 준비
- Managed Markets 자격 요건(미국 기반 셀러 등) 제약 → Shop 구성 확인 필요
- Shopify 박스 조회 API 부재 → 로컬 미러링 유지

---

## Implementation

- Plan: [2026-04-15-shopify-package-master-plan.md](../../docs/plans/2026-04-15-shopify-package-master-plan.md)
- Plan: [2026-04-15-consolidation-compliance-engine-plan.md](../../docs/plans/2026-04-15-consolidation-compliance-engine-plan.md)
- Affected: Calculator/Spec, Quote/Spec, Order-Checkout/Spec, Shopify-Integration/*

---

## Related

- [ADR: Cart_Trigger_Shopify_Product](2026-04-15_ADR_Cart_Trigger_Shopify_Product.md)
- [ADR: Consolidation_Compliance](2026-04-15_ADR_Consolidation_Compliance.md)
- [Research: HS Code Consolidation Customs](../Reference/Research/2026-04-15_HS_Code_Consolidation_Customs_Research.md)
