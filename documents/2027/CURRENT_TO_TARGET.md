# 2027 documentation reconciliation — CURRENT vs TARGET vs DEPRECATED

> **<u>HOME_HUB 초기 운영 및 여러 주문의 합배송 추천이 핵심 목표다.</u>** [자택 배대지·합배송 SRS](HOME_HUB_AND_CONSOLIDATION_SRS.md)에 있는 HUB/CON/GEO/OPS 요구사항과 TC-HUB/TC-CON/TC-GEO 테스트를 이 문서의 필수 하위 명세로 적용한다. 초기 3PL 계약은 필수 아님; 실제 운송사·통관/관세 증거 없는 절감액을 고객에게 확정 표시하지 않는다.

> **<u>최상위 제품/사업 방향은 [역직구 컴파일러 + MD 헌장](PRODUCT_VISION_COMPILER_AND_MD.md)이다.</u>** 이 문서는 컴파일러의 일부 요구사항을 상세화하는 하위 문서다. 신규 API 개발이나 Day 0 목록을 목표로 삼지 말고, URL→상품 증거→국가별 관세/규제→DDP/배송 최적화→고객 총액·주문 상태, 그리고 MD 큐레이션으로 연결한다. 미구현 기능은 미구현으로 표시한다.


Status: Documentation-only alignment as of 2026-11-21. **No production implementation is implied.**

## Source precedence

1. Actual code and verified tests determine **current implementation** (do not claim a feature exists because a target document says SHALL).
2. `documents/2027/INTEGRATED_SRS.md` is **future V3 requirements**, this map documents explicit deltas.
3. `documents/2027/AGENT_IMPLEMENTATION_PLAN.md` instructs how to build V3 safely.
4. `documents/2027/TEST_MATRIX.md` defines future acceptance evidence.
5. `documents/Features/STATUS.md` describes current state and release blockers. Keep historical 2026 test logs historical.
6. Other existing docs describe current modules unless a section explicitly says V3 TARGET. Do not rewrite old records of actual tests or historical payment policies.

## Contradictions found and resolution

| Existing document / text | Problem | Resolution |
| --- | --- | --- |
| `README.md`: "고객 대시보드는 제거" | Correct V2, conflicts with desired signed-in order-first home | Clarify **past legacy AI dashboard removed**, V3 proposes authenticated order summary, not AI chat. |
| `documents/PRODUCT_SPECIFICATION.md`: "대화형 AI, 모델 API, 상품 검색 에이전트, 고객 대시보드 제거" | Says removal is permanent | Preserve no AI chatbot; add V3 TARGET order summary. |
| `documents/PRODUCT_SPECIFICATION.md`: ₩10,000 minimum | Contradicts newer approved 15% no min | Rewrite as historical previous-policy, not new quote policy; leave paid legacy untouched. |
| `documents/Reference/OPERATIONS.md`: ₩10,000 minimum | Same conflict | New quotes 15%, no minimum; clarify historical paid-min policy. |
| `README.md`: input URL only validated, not fetched | Correct current safety | Do not replace with claim of live extraction; future permission-respecting adapters are target. |
| `documents/Features/STATUS.md`: catalog 8 static products, no full public verified quotes | Correct present state | Add target-specific link; do not claim new MD or data feed live. |
| `documents/Features/Order-Checkout/Spec.md`: one request/one retailer order | Correct current limitation | Future multi-item order, multiple supplier orders, split/consolidated shipments via additive migration. |
| `documents/Reference/COUNTRY_CUSTOMS.md`: country policy overdue 2026-11-11 | Current release blocker | Keep deadline and block, never change timestamps to pass. |
| `documents/Reference/TAX_AND_CUSTOMS.md`: unknown statutory rules / VAT refund cautions | Good safety baseline | Preserve; proposed country engines require verified legally current rule datasets. |
| `features/storefront/README.md`: 8 MD references | Accurate baseline | Add editorial + country-aware commerce target with no invented discounts. |
| Legacy references to global 54-country auto-DDP/AI agents | Explicitly deprecated | Do not resurrect or promise. |

## Product decision record (discussed, not yet implemented)

- Public/non-auth primary experience (tab split updated 2026-11-24): Paste a Link owns customer URL entry and welcome; Discover Korea owns merchandise without URL input; How It Works combines buying/shipping/returns/FAQ. No forwarder or courier chooser. The current catalog remains eight seller references.
- Authenticated new/returning experience: active order and required actions first on home, then URL entry; MD remains in Discover Korea. Users without active orders see the welcome.
- MD should prioritize **evidence-backed** attractive goods including Korean limited goods, K-pop, stationery, books, beauty where legally supported, plus clearance genuine Nike/Adidas only after exact-SKU price matching by destination. No assumption unpopular in Korea implies demanded abroad. Country-specific customs and shipping cost is part of merchandising score.
- Delivered Korea benchmark: public We Buy & Ship auto-load attempt, manual fallback, human quote, delivery and return policy guide, warehouse/consolidation. Do not copy protected design/data or reverse engineer access-controlled systems. Language support is **not** proof China is their primary buyer.
- KRDS benchmark: accessible components, design tokens, consistent navigation, forms, progress and helpful error states; existing playful Three.js home can remain as brand character. Don't replace functional shopping with a decorative 3D scene.
- Customer abstractions: hide internal procurement/warehouse/carrier decision UI; disclose costs, who pays duties, identity/permissions, ETA evidence, delays, cancellation/refund rights.
- Checkout: all-in only when validated; otherwise Needs review. Automatic shipping discount claim requires actual carrier rates, handling/storage, billable weight, customs and SLA comparison.
- No 2027 law/tariff certification from prose. Each live route requires effective-date official evidence and a qualified review.

## Agent reconciliation protocol

For EACH edited document:
1. Add a top-level current/future/deprecated status section if ambiguity exists.
2. Align policy figures and state explicitly what is historical.
3. Link exact SRS section and ID range.
4. Retain historical operational commands, actual test counts, evidence dates, and deployment warnings.
5. Avoid calling an unimplemented feature "now available".
6. Make a PR changing code separately; do not expose placeholder customs/shipping values to customers.

## Known unresolved dependencies

Trade legal role and importer-of-record, 2027 tariff schedules and origin/FTA substantiation, first authorized merchant feeds, real 3PL and carrier quotations, payment/refund gateway test, domestic source purchase authorization, limited goods restrictions and return economics, Korean VAT treatment depending on principal/agent role, price changes between checkout and dispatch, genuine product verification, destination consumer protection laws and privacy/retention.

## Release gate overview

No live country advertised as fully supported until permitted merchant sourcing, category-specific import clearance, required recipient authorizations, approved customs assessment, contracted shipping, signed tracking, payment/refund, SLA and user-facing policies have a tested end-to-end route. Begin with one country and low-risk SKU slice; expand after evidence.
## Main-screen delta — updated 2026-11-24

Implemented locally: three distinct tabs, home destination/URL entry with the original parcel welcome, Discover Korea seller-reference search and destination-aware MD draft handoff without URL input, authenticated attention-first active-order summary, and a combined How It Works/shipping/returns/FAQ guide with a legacy-route redirect. The earlier consolidation implementation remains isolated from paid checkout. Country-approved MD, live landed-cost compiler, multilingual/currency UI, real intake/consent/booking and complete refund operation are still targets. [Detailed before/after](LEARNING_STEP_03_MAIN_COMMERCE_HOME.md).

## Owner screen-design correction — 2026-11-23

Keep the implemented UX but restore the earlier screen design: original cream/blue/coral customer shell, large parcel studio, outlined controls and illustrated details. Paste a Link is first and opens `/`; Discover Korea is second. Destination handoff, owned active-order home, guide access, catalog search and the matching 3D poster remain. This supersedes the initial Step 3 global white/orange restyle, not the separate consolidation preview. The icon startup/build-manifest safeguards are documented in [Step 3](LEARNING_STEP_03_MAIN_COMMERCE_HOME.md).
