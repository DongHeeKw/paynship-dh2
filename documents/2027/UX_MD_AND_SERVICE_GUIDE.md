# PayNShip V3 — Customer journeys, merchandising, service-guide and failure handling

> **<u>HOME_HUB 초기 운영 및 여러 주문의 합배송 추천이 핵심 목표다.</u>** [자택 배대지·합배송 SRS](HOME_HUB_AND_CONSOLIDATION_SRS.md)에 있는 HUB/CON/GEO/OPS 요구사항과 TC-HUB/TC-CON/TC-GEO 테스트를 이 문서의 필수 하위 명세로 적용한다. 초기 3PL 계약은 필수 아님; 실제 운송사·통관/관세 증거 없는 절감액을 고객에게 확정 표시하지 않는다.

> **<u>최상위 제품/사업 방향은 [역직구 컴파일러 + MD 헌장](PRODUCT_VISION_COMPILER_AND_MD.md)이다.</u>** 이 문서는 컴파일러의 일부 요구사항을 상세화하는 하위 문서다. 신규 API 개발이나 Day 0 목록을 목표로 삼지 말고, URL→상품 증거→국가별 관세/규제→DDP/배송 최적화→고객 총액·주문 상태, 그리고 MD 큐레이션으로 연결한다. 미구현 기능은 미구현으로 표시한다.


Status: TARGET UX / NOT IMPLEMENTED · As of 2026-11-21

## 1. Design brief — KRDS discipline + distinct PayNShip identity

Reference: https://www.krds.go.kr/html/site/index.html for accessible design-system discipline only. **Owner correction (2026-11-23): retain the original cream/blue/coral customer storefront design.** The separate consolidation/HOME_HUB preview remains white with orange accents. See [actual development UI preview](UI_WHITE_ORANGE_CONSOLIDATION.md) and scoped CSS Module. Keep Three.js welcome graphics restrained where discovery benefits, never hide order/tracking details. The visual goal is trustworthy, friendly and understandable by a first-time overseas shopper. No government-style affiliation/badge and do not copy proprietary assets.

**Top nav (owner correction 2026-11-24):** PayNShip logo, Paste a Link (home), Discover Korea, How It Works (buying + shipping/returns + FAQ), account entry. Language/currency switching remains a target, not a shipped control. Signed-in state adds Orders with notification count. On mobile keep catalog search and tracking reachable with keyboard/voiceover. The hero must not prevent quick product discovery; 3D cannot block interaction and has reduced-motion support and a matching studio poster fallback.

Implementation note (2026-11-23): the current fallback is now a preloaded still rendered from the actual studio, with reduced-motion-aware crossfade and context-loss recovery. This supersedes the separate SVG for visual continuity; it remains a static image until WebGL is ready. Language/currency switching and country-approved MD remain unimplemented.

### Screen A — guest entry tabs
- Paste a Link (`/`): original one-sentence promise and engaging parcel world, customer URL field and destination select (neutral default; do not geo-infer location). Keep merchandise cards and the full service guide in their own tabs.
- Discover Korea (`/products`): MD merchandise, search/categories and destination choice, with no URL field or URL-entry prompt. Current cards are seller references; verified country-specific curation remains a target. Both entry paths feed the same purchase review/compiler.
- Featured collections in Discover Korea: Korean exclusives, K-pop, books/stationery, fashion/accessories, clearly marked restricted/eligible availability by destination. Nike/Adidas outlet/older-season wear may be an editorial candidate **only after** genuine stock and same-SKU landed-vs-local pricing validation; do not label "old fashioned" as a demographic fact.
- Empty URL / unsupported host / missing option / access disallowed: human actionable explanation + manual request; never error page that loses draft.
- Show fees early: product, 15% service, domestic/overseas freight, duties/taxes/clearance and payer; missing charge `Needs review`. Avoid false "free shipping".
- How It Works (`/guides/how-it-works`): original illustrated buying steps, costs, shipping, returns, support guidance and expandable FAQ in one guide. `/guides/shipping-and-returns` redirects here. Never describe future compiler/booking capabilities as live.

### Screen B — product detail
- Verified product title, original source brand/store, seller/availability, provenance timestamp, variant choices and quantity.
- Destination country, "Can we deliver?" preview; if legally unverified, "Request a verified quote", **not Buy Now**.
- Current KRW price and buyer-currency estimate separately (FX timestamp and any markups); no fake sale percentage.
- Explain genuine goods evidence if claims made; do not claim Nike/Adidas manufacturer authorization without evidence.
- Product material/manufacture origin where verified; missing values explicitly unknown.
- Accessibility: images with alt, live validation error, skip links, appropriate keyboard controls.

### Screen C — URL purchase
- Input: URL, country, variant, quantity. Preview stages as short understandable messages: Identifying product → Checking product details → Reviewing import requirements → Estimating full cost.
- Stage statuses are `observed`, `requires confirmation`, `not supported`, `review in progress`. Never show artificial percentage progress while fetching third parties.
- If extraction blocked (e.g. Naver restrictions), customer may attach an authorized product title, option, publicly viewable screenshot/photo when permitted; manual review. Do not automatically trust customer screenshot as origin/tax proof.
- Login prompt only for saving address, confirmed purchase request, checkout and personal tracking.

### Screen D — guest to account
- Login/signup via configured providers only. Failed OAuth does not lose non-PII URL draft. Signed callback must not allow open redirect or cross-user draft takeover.
- Shipping address and necessary recipient customs authorization collected server-side after auth and only when required for the chosen route.
- Signed-in with no active order: Paste a Link welcome; Discover Korea stays directly reachable, no faux tracking.
- Signed-in with active order: actionable current order summary above URL entry; MD remains in Discover Korea. Most urgent customer action (customs ID, address correction, quote approval) top.
- Only verified date windows; if no reliable ETA use "Delivery estimate pending" and last confirmed scan time.

### Screen E — Order detail
- Summary: order #, placed time, item/variant/quantity, amount paid, importer payer, estimated arrival range if verified.
- Timeline: Confirmed → Purchasing → Preparing shipment → In transit → Delivered. Preserve exact internal events in expanded detail: merchant ordered, warehouse arrival, inspected, customs handed over/held, carrier scan, failed delivery.
- One order can contain multiple packages; each package shows its own tracking state and last signed provider update. An overall order cannot be marked delivered if an undelivered required package remains.
- On-hold exceptions use reason/action/deadline; no deceptive "Your parcel is moving" text.
- View invoice, shipping & returns, customer support; carrier and waybill can appear in details/trace links but not as a selection task.
- Sensitive recipient IDs are never echoed in public response or tracking share link.

### Screen F — service guide / Help Center (before launch)
Navigation: Buying & authenticity, Supported stores, Order and payment, Customs & duties by country, Shipping & delivery estimates, Restricted products, Damage/loss, Cancellations and refunds, Privacy. Make this accessible from footer, product detail and checkout. Version each public policy with published date and locale. User must consent to payment/cost-variation/return disclosures relevant to order.

## 2. Policy details the operator must decide and publish

| Policy ID | Customer-facing requirement | Internal operations/testing |
| --- | --- | --- |
| POL-001 | When purchase request becomes actual order; quote expiration and potential price changes | Time-stamped acceptance and supplier purchase evidence |
| POL-002 | Sourcing/inspection/packing milestones and standard vs delayed service estimates | Only promise dates supported by measured processing and carrier contract |
| POL-003 | Which products/routes cannot ship, with reason and alternatives where lawful | Excluded categories, battery, liquid, cosmetic, restricted material, export controls |
| POL-004 | Who pays duties/VAT/brokerage (DDP/DAP), and when | Proven carrier contract and importer-of-record signoff |
| POL-005 | Cancellation before/after actual purchase and before/after shipping; local consumer laws | Refund ledger, provider refund proof, reversal reconciliation |
| POL-006 | Damaged/wrong/defective goods reporting, required evidence, deadline | Consumer rights trump arbitrary policy deadlines; warehouse and claims path |
| POL-007 | Return label/warehouse, shipping and customs tax recovery where available | Verified carrier route and financial reconciliation |
| POL-008 | Lost parcel, delivery exception, address corrections and held customs parcels | Customer action CTA + ops alert and escalation ownership |
| POL-009 | Packaging, consolidation consent and tradeoff between time vs money | Rate evidence and SLA; no consolidation without legal compatibility |
| POL-010 | Import identity/personal data, retention, access and deletion request route | Least collection, encrypted storage, broker secure channels |
| POL-011 | Product authenticity and resale rights; authorized seller statements only when proven | Manufacturer/SKU, invoice, chain of custody; avoid false affiliation |
| POL-012 | Languages, accepted currencies, FX cut-off and chargeback/appeals | Translations reviewed, payment processor terms followed |
| POL-013 | What customer sees if seller cancels or item goes out of stock after quote | Hold, substitute only with explicit customer approval or refund |
| POL-014 | After checkout mandatory tax/fee increases | Contracted payer and explicit customer consent/adjustment or cancellation; preserve paid amounts |
| POL-015 | Support contact, operating hours, response SLA | Honest capability; don't promise 24/7 until staffed |

**Do not copy Delivered Korea’s refund windows or delivery time promises.** They are benchmarking data, not PayNShip's own contractual commitments. All customer policy content must be reviewed and localized before launch.

## 3. MD ranking inputs and safeguards

Candidate features: verified local availability (hard gate), verified export admissibility (hard gate), price evidence freshness (hard gate for "cheaper" tag), Korea exclusive indicator with source, current global competition for **identical SKU/color/size**, actual landed cost with taxes, potential net margin after sourcing/pack/payment/returns, category relevance, quality/return risk, inventory durability and merchandising diversity.

Ranking must be auditable and avoid clickbait: `score = weighted relevance + verified availability + verified unique value + margin after costs - return/fulfillment risk`. No historical conversion data? Do not pretend ML model knows foreign demand. Collect privacy-safe impressions, product details views, quote requests, approvals, delivered orders, return reasons; do not over-personalize guest tracking.

Minimum MD collection provenance: editor, edit time, verified proof URLs, exact SKU, country availability evidence, live stock timestamp and reason code. Tags "Korea-only" and "cheaper than local" require separately approved substantiation. Brand trademarks should never imply official partnership.

## 4. Shipping quote optimization contract

- Decide supplier purchase grouping vs international shipment grouping separately. Merge only legally compatible parcels for one approved recipient.
- Rate candidate must contain `carrierService`, `transitTimeRange`, `actualWeightGrams`, `dimWeightGrams`, `billableWeightGrams`, `zone`, `remoteAreaFee`, `fuelSurcharge`, `clearanceFee`, `taxPayer`, `insuredValue`, `rateValidUntil`, `carrierRef`, `approvalStatus`.
- Use package-specific measured weights; never assume merchandise dimensions == packed dimensions. Compare 1-box vs n-box plans and 3PL repack labor, 3PL storage, domestic carrier shipments, customs handling, insurance and delivery delay.
- Optimize total **legal fully loaded** cost subject to delivery promise. If consolidated shipment delays an item beyond its promise, do not silently choose the cheaper path.
- Do not split parcels to artificially misstate value or evade customs. No carrier contract = no definitive "best shipping" price.
- If risk of damage/liquid/battery/magnetic/electrical restrictions, route to appropriate verified carrier or manual exception.

## 5. What "reverse engineering" means for this project

Public black-box usability research, **not** copying Delivered Korea source code, scraping protected APIs, circumventing login/anti-bot or extracting private service tokens. Benchmark public guide information architecture, URL request validation, manual request form, pricing disclosures, prohibited item messaging, post-payment status and cancellation.
For merchant site analysis use official APIs/affiliate agreements first, permitted public HTML and JSON-LD second, manual evidence last. Respect robots and site terms; avoid uncontrolled commercial crawling.

## 6. Owner sign-off checklist

Before marking site launch-ready: test product from US/JP/CN route with verified origin, classification and charges; signed checkout and refund; actual 3PL receipt photos; approved carrier and tracking; ETA disclosures; customer support; country consumer-rights review; user-owned tracking access; incident response and data deletion. Until then call it pilot/preview rather than a fully automated global store.

## Shipped in local source — updated 2026-11-24

The main route `/`, shared navigation and `/orders` now reflect the URL-entry/owned-order journey rather than New request/My requests tabs. Home owns URL entry and loads only authenticated owned active summaries, prioritizing holds and quote actions; no ETA is inferred. Discover Korea owns the existing MD catalog/draft flow with destination handoff and no URL-entry prompt. The single How It Works guide is reachable from navigation and footer, contains the illustrated journey plus shipping/returns/FAQ, and explicitly distinguishes unavailable refund automation/live consolidation. The owner rejected the replacement screen styling; the original storefront palette, full-size studio and illustrated details are restored while guest MD/search/destination and the new navigation remain. Language/currency controls, approved country MD, verified full landed quotes, durable consolidation consent and multi-box tracking are not claimed complete. See [Step 3](LEARNING_STEP_03_MAIN_COMMERCE_HOME.md).
