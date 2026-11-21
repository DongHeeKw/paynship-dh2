# Product browsing

> **2027 MD 확장 목표 (미구현):** [통합 SRS](../../documents/2027/INTEGRATED_SRS.md) · [상세 실행 순서](../../documents/2027/AGENT_IMPLEMENTATION_PLAN.md). 현재는 8개 참조 상품/페이지 4개/카테고리 5개가 유효합니다. 목표는 비로그인도 볼 수 있는 근거 기반 MD 큐레이션, SKU/옵션별 가격·원산지·판매가능 국가·검증시간 관리, 한국 한정판과 공식 정품 세일 의류 후보의 국가별 총 도착원가 비교입니다. 미국/중국에 싸다는 주장, 세관 승인 및 배송 가능 표시는 실제 검증 없이는 금지합니다.

Owner: `catalog/` contains the eight references, category policy and pagination; `products/` presents them. Route: `/products`. Shared purchasing and fee logic stays in `lib/purchases/`.

Eight seller references cover beauty, stationery, home, accessories and K-pop. Four products appear per page. A labelled native category select filters before pagination; category/page live in the URL and survive reload/history. Seller photos are local, attributed through each listing and `catalog/references.json`; no invented prices, stock or customs approval. `catalog/collection-evidence.json` retains dated collection provenance. Check dates belong to the individual evidence record and are not refreshed by a code deployment.

Selecting a product saves the exact listing, category, quantity and product-name options to the bounded same-tab intake draft. The public request form performs its own URL and category checks. All eight links have regression coverage against the server URL policy, including precise Cafe24 product identifiers and Korean KRW Weverse URLs. Cosmetic ingredients, fragile packaging and light-stick batteries still require review.

The shared cream/cobalt/coral/navy theme also applies to request, address and account pages. The [welcome scene](../../components/home/README.md) is separate from product browsing. Canonical fee policy: [pricing](../../documents/Features/Pricing/Spec.md).

Validation: catalog tests cover pagination/filter boundaries and link compatibility; `e2e/public-journey.spec.ts` covers loaded photographs, keyboard selection, browser history, draft handoff and responsive layouts.
