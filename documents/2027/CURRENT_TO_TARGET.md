# 2027 documentation reconciliation — CURRENT vs TARGET vs DEPRECATED

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

- Public/non-auth primary experience: curated Korean merchandise discovery + URL input, natural scroll; no forwarder or courier chooser.
- Authenticated new/returning experience: active order and required actions first; MD continues under order information; users without active orders see discovery.
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