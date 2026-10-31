# Scraper v6.0 — Identity Fields + Pivot Search

> **Date**: 2026-04-15
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

v5.0까지 스크래퍼는 상품 URL 하나에서 Critical Fields(weight/dim/origin/hsCode)를 뽑고 부족하면 Tavily 타겟 쿼리를 수행했다. 그러나 실무에서 정확한 견적·발주를 위해서는 **브랜드/SKU/시즌/판매가/할인가/최대 혜택가/적립 포인트** 같은 정체성·가격 맥락 필드가 더 중요하다는 점이 드러났다. 이들은 상품 페이지 한 곳에서 끝나지 않고, 브랜드 공식 사이트·공식 리테일러·종합 마켓·독립몰을 교차 확인해야 정확도가 올라간다. 동시에 LLM 비용은 통제해야 한다.

---

## Decision

v6.0에서 **Identity Fields**와 **Pivot Search Engine**을 도입한다.

1. **Identity Fields** 추출: `brand`, `sku`, `releaseDate`, `season`, `listPriceKrw`, `discountPriceKrw`를 Phase 1/2에서 즉시 추출
2. **Internal-only Fields** 분리: `maxBenefitPriceKrw`, `maxBenefitMethod`, `maxBenefitUrl`, `rewardPoints`는 `internalMetadata` JSON에 저장하고 고객 응답에서 제외
3. **Pivot Search Engine**: brand + name + SKU + season 조합으로 4-tier 순차 탐색
   - T1: 브랜드 공식 홈페이지 (도메인 whitelist, LLM 추론 결과를 DB 캐싱)
   - T2: 공식 리테일러
   - T3: 종합 마켓플레이스 (쿠팡/G마켓/네이버/11번가)
   - T4: 독립몰 (Cafe24 등)
4. **호출 한도**: 비회원 3회 / 회원 무제한 (Admin Settings에서 조정)
5. **재스크래핑 주기**: 자동 3h + 사용자 Refresh 버튼 (가격·variant 재고만 대상)
6. **브랜드 도메인 캐싱**: LLM으로 추론한 brand→domain 매핑은 `brand_official_domains` 테이블에 영구 저장하여 재추론 비용 절감

---

## Rationale

- Identity Fields는 웹 전반에서 동일 상품을 식별하는 유일한 안정 키 → 이것 없이는 Pivot Search가 불가능
- 최대혜택가는 발주 운영의 핵심 정보(수익 최적화)이나 고객 UI에 노출되면 혼란·분쟁 → Public/Internal 분리 필수
- 브랜드 도메인 추론은 LLM 호출당 ~$0.002 발생. 한 번 추론된 결과는 변하지 않으므로 캐싱 시 누적 절감 효과 큼

### Considered Alternatives

1. **기존 Tavily 검색만 확장**: 브랜드 힌트 없이 범용 검색만으로는 쇼핑몰 페이지가 상위에 노출되어 신뢰도 낮음. 기각.
2. **브랜드 도메인 수동 큐레이션만**: 초기 셋업 비용 큼, 신규 브랜드 대응 느림. LLM 추론 + 캐싱이 자동화·정확도 균형에서 우수. 기각.

---

## Consequences

### Positive

- 상품 정체성 확보로 관리자 교차조사(최저가 발주) 가능
- Pivot Search로 weight/origin 등 Critical Fields 보강 정확도 향상 기대
- 브랜드 도메인 캐싱으로 LLM 비용 누적 절감

### Negative

- 데이터 모델 확장(필드 10+ 추가) 및 Prisma 마이그레이션 필요
- Pivot Search 호출 한도 게이트 로직 신규 구현
- Public/Internal DTO 2종 분리로 API serialization 복잡도 증가

### Risks

- LLM이 추론한 브랜드 도메인 오탐 시 스크래핑 결과 오염 → domain confidence score 저장 + 임계치 미만은 admin review
- Pivot Search T3/T4 단계에서 봇차단 강화된 사이트(쿠팡 등) 실패율 증가 → Scraper Server fallback chain으로 대응
- Internal 필드 누출 시 고객 신뢰 타격 → DTO 단계에서 화이트리스트 방식 serialization

---

## Implementation

- Plan: [2026-04-15-scraper-v6-pivot-search-plan.md](../../docs/plans/2026-04-15-scraper-v6-pivot-search-plan.md)
- Design: [2026-04-15-scraper-v6-pivot-search-design.md](../../docs/plans/2026-04-15-scraper-v6-pivot-search-design.md)
- Affected: Scraper/Spec, Product-Data-Pipeline/Spec, LLM-Agent/Spec, Admin-Settings/Spec

---

## Related

- [ADR: Cart_Trigger_Shopify_Product](2026-04-15_ADR_Cart_Trigger_Shopify_Product.md)
- [ADR: Shopify_As_Shipping_Backend](2026-04-15_ADR_Shopify_As_Shipping_Backend.md)
- [Previous: 2026-03-02 Scraper Pipeline Redesign (v5)](../../docs/plans/2026-03-02-scraper-pipeline-redesign-plan.md)
