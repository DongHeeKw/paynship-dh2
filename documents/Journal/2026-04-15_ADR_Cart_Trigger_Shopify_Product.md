# Cart-Add Triggered Shopify Product Creation

> **Date**: 2026-04-15
> **Decision Maker**: Doyun + Claude
> **Status**: ✅ Accepted

---

## Context

PayNShip은 한국 여러 셀러의 상품을 해외 고객에게 대행 판매한다. 고객이 URL을 채팅에 붙여 넣으면 스크래핑 후 장바구니에 담는 UX인데, 장바구니·결제·배송 계산을 Shopify에 위임하기로 한 이상, Shopify에는 원본 URL 상품에 해당하는 Product가 존재해야 한다. 모든 URL을 미리 상품화하기엔 낭비가 크고, 반대로 결제 직전에 만들면 박스 매칭·배송 계산 타이밍이 어긋난다. 또한 동일 URL/SKU 재조회에 대한 재사용 규칙도 필요하다.

---

## Decision

**고객이 Cart에 상품을 추가하는 순간 Shopify Product + Variant를 자동 생성하고 72시간 TTL을 둔다.**

1. **생성 타이밍**: Cart-add 직전 Phase 3 Deep Scrape 완료 후 즉시
2. **TTL**: 72시간 → 경과 시 `status: archived` + inventory `0`(품절 처리). **Shopify 상품 레코드는 삭제하지 않음** (재사용 대비)
3. **Variant 범위**: 고객이 채팅에서 선택한 옵션 조합만 Variant로 생성
4. **재조회 규칙**:
   - 같은 URL 재진입 → 기존 Shopify Product의 inventory 복원
   - 같은 SKU, 새 옵션 조합 → 기존 Product에 **Variant 추가**
5. **매핑**: `sourceUrlHash ↔ shopifyProductId` 관계를 `ShopifyProductMirror` 테이블로 관리

### Shopify 필드 매핑

| Scraped | Shopify Product | Shopify Variant |
|---------|-----------------|-----------------|
| brand | vendor | — |
| name | title | — |
| category | product_type | — |
| sku | — | sku |
| discountPriceKrw (없으면 listPriceKrw) | — | price |
| listPriceKrw | — | compare_at_price |
| weightKg | — | weight + grams |
| hsCode | — | hs_code |
| origin | — | country_code_of_origin |
| dimensions | — | (metafield) |

---

## Rationale

- Cart-add = 고객의 구매 의도 확정 시점 → Shopify Product 생성 비용(무료)이 정당화됨
- 72h TTL: 일반적인 구매 검토 사이클 포괄 + 재고/가격 변동 노출 최소화
- DB 레코드 유지: 재구매·재조회 시 Product 재사용 → Shopify API 호출 절감
- SKU별 Variant 추가: 동일 상품 다른 옵션 조합을 별도 Product로 만들지 않아 관리 복잡도 감소

### Considered Alternatives

1. **URL 입력 즉시 Product 생성**: 구매 의도 없는 URL까지 상품화되어 Shopify 어드민 오염. 기각.
2. **Checkout 시점 생성**: 박스 매칭·배송 계산이 결제 직전에만 가능 → 장바구니 단계 견적 표시 불가. 기각.
3. **72h 후 완전 삭제**: 재주문·재조회 시 Product 재생성 부담 + 과거 주문의 Product 참조 깨짐. 기각.

---

## Consequences

### Positive

- Cart 단계에서 정확한 배송비·관세 견적 표시 가능
- 동일 상품 재주문 시 데이터 재사용으로 Shopify API 부담 감소
- Shopify 어드민에 실구매 의도가 있는 Product만 관리됨

### Negative

- Cart-add마다 Shopify Product/Variant 생성 API 호출 → 레이턴시 +1~2s
- 아카이브된 Product가 축적되어 장기적으로 어드민 목록 길어짐 → 90일 후 정리 정책 별도 필요
- Variant 추가 규칙이 Shopify의 Variant 최대 수(100) 제한을 초과할 가능성 → 엣지 케이스 처리 필요

### Risks

- 72h 이내 가격이 변동되었는데 복원 시 구버전 가격 노출 → 재스크래핑 주기(3h)로 완화
- SKU 누락/오인식 시 잘못된 Product에 Variant가 붙을 위험 → SKU + brand + normalized name 복합 키로 검증
- Shopify 레이트 리밋 → 큐잉 + 백오프

---

## Implementation

- Plan: [2026-04-15-shopify-product-autocreation-design.md](../../docs/plans/2026-04-15-shopify-product-autocreation-design.md)
- Plan: [2026-04-15-cart-trigger-deep-scrape-design.md](../../docs/plans/2026-04-15-cart-trigger-deep-scrape-design.md)
- Affected: Cart/Spec, Shopify-Integration/Products-Spec, Order-Checkout/Spec

---

## Related

- [ADR: Shopify_As_Shipping_Backend](2026-04-15_ADR_Shopify_As_Shipping_Backend.md)
- [ADR: Scraper_v6_Pivot_Search](2026-04-15_ADR_Scraper_v6_Pivot_Search.md)
