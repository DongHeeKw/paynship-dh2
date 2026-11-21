# Agent implementation playbook — PayNShip 2027

**Status: SPEC ONLY, implementation not complete.** Read [Integrated SRS](INTEGRATED_SRS.md), [test matrix](TEST_MATRIX.md), and [current-vs-target map](CURRENT_TO_TARGET.md) first. These are the governing V3 **future design**. Existing operating code and historical payments are unchanged until implementation PRs have been reviewed. Review official customs sources and real carrier contracts before enabling any production quote. Do not "fix" an expired customs deadline by moving the date.

## A. What the owner actually wants (acceptance narrative)

1. A visitor arrives to a memorable Korea-focused shop, sees compelling MD merchandise and can paste a Korean merchant URL **without logging in**.
2. The service extracts what it can from **permitted** Naver/Musinsa/Daiso/other store sources, shows exact item/size/color/qty, country, indicative cost, and plainly marks missing attributes. It does not pretend HTML reveals US/JP/CN tariffs.
3. The customer sees a trustworthy **whole-order price** before paying. PayNShip chooses purchasing location, warehouse, consolidation and carrier. The customer isn't required to choose a forwarder or courier; shipping/payment obligations, possible customs charges and delivery window remain explicit.
4. A returning authenticated customer sees **their live order and action requests first**, but MD content remains available. Never show fabricated delivery data.
5. Internally, sourcing, customs, warehouse, carrier and refunds are separately testable modules behind a single orchestrator.
6. Offer exceptional Korean deals (including older-style or clearance Nike/Adidas originals) only when **exact SKU, authentic stock, imported-country local competing price, and true landed cost** substantiate a competitive-price label. Discount rate is not evidence of a profitable arbitrage.
7. Use Delivered Korea as **public UX/service-guide benchmark** (quote/manual fallback, sourcing, storage, forbidden goods, cancellation/refund and shipping milestones). Avoid copying protected content, private APIs or unverified market-share statements. Use KRDS as **design-system inspiration**, not a government affiliation.

## B. Day-zero agent checklist (no feature changes until done)

1. Read README.md, package.json, prisma/schema.prisma, documents/PRODUCT_SPECIFICATION.md, documents/Features/STATUS.md, documents/Features/Pricing/Spec.md, documents/Features/Order-Checkout/Spec.md, documents/Reference/COUNTRY_CUSTOMS.md, TAX_AND_CUSTOMS.md, OPERATIONS.md, SECURITY.md, features/storefront/README.md, existing tests and migrations.
2. Obtain clean baseline and latest main SHA; identify DB migration state and production provider configuration without printing secrets. Ensure docs V3 target ≠ implemented facts.
3. Run **actual** `npm run type-check`, `npm run test:ci`, `npm run docs:check`, `npm run build`, relevant Playwright tests. Report commands, pass/fail, environment, commit. Do not say tests ran merely because earlier STATUS records old results.
4. Inventory actual routes and server modules before selecting filenames. Where this plan names future modules but they don't exist, create with tests rather than replacing existing working components.
5. Preserve deployed gates including country evidence expiry, signed Shopify/carrier webhook, immutable historical quotes, MFA, encryption, ownership/RLS, replay protection.
6. Track each PR by `EXP-/URL-/CUS-/PRC-/ORD-/SHP-` requirements and `TC-` tests. Default to additive backwards-compatible migrations.
7. Stop if legal trade role, broker rate, carrier API, site scraping permission or data retention decision blocks valid implementation. Build stub interface **that fails closed**; never invent approved tariff rates or fabricate shipping events.

## C. Explicit file-by-file implementation map

Paths below are responsibility targets, **not assertions that each file currently exists**.

| Stage | Read/update existing | Create or extend | Exact change | Done when |
|---|---|---|---|---|
| P0 source of truth | `README.md`, `documents/PRODUCT_SPECIFICATION.md`, `documents/Reference/OPERATIONS.md` | docs/2027/* | Fix minimum-fee conflict; separate current/target; links and scope; **no feature flag activation** | SRS + code + price spec agree on 15%, no min; old paid quotes untouched |
| P1 schema/evidence | `prisma/schema.prisma`, current migrations, `lib/product-evidence/` | `lib/merchants/`, `lib/trade/evidence/` | Define merchant, variant, field provenance, immutable quote evidence and origin vs seller-country; candidates != verified | schema migration/backfill/rollback and URL tests pass |
| P2 country compliance | `lib/customs/`, `lib/purchases/`, `documents/Reference/COUNTRY_CUSTOMS.md` | `lib/trade/classification/`, `lib/trade/rules/{us,jp,cn}/`, `lib/trade/valuation/` | Effective-dated tariff + product-specific import restrictions; payment blocked when missing or expired | Golden fixtures signed and 100% matches for launched routes |
| P3 landed quote | `lib/purchases/service-fee.ts`, pricing/quote paths, `documents/Features/Pricing/Spec.md` | `lib/pricing/landed-cost/` | Exact-money line breakdown, route valuation, duty/additional tax/fees, FX, DDP/DAP, validity and snapshots | No unknown mandatory charge appears as zero, existing paid quote immutable |
| P4 public MD and URL | `features/storefront/`, `app/products/`, `app/purchase/` and URL policy | `lib/merchants/adapters/`, MD admin components | Verified, curated card grid; URL explainable extraction/fallback and country preview; exact SKU | Guest and auth behavior tests, allowed-source benchmark |
| P5 signed-in UX | `app/` auth/home/orders, `lib/purchases/` | dashboard view components in `features/account/` / `features/tracking/` | Active-order summary above MD; no order => discovery first; exception CTA, timestamps and owned events | Cross-account E2E, accessible responsive preview |
| P6 order aggregates | `PurchaseRequest`, `PurchaseEvent`, `Order` legacy models | `OrderItem`, `DomesticPurchase`, `WarehouseReceipt`, `ShipmentPackage`, adapters | Support one order to many purchases/boxes without breaking old single-item path | Split and consolidation tests, historical data preserved |
| P7 shipping optimizer | `documents/Reference/OPERATIONS.md`, shipping webhook | `lib/fulfillment/consolidation/`, `lib/fulfillment/carriers/` | Compare full costs incl dimensional weight, packing/storage/customs and carrier service limits; no parcel counterfeiting | Approved carrier quotes and signed tracking events, no inferred delivered |
| P8 customer protection | checkout/support/refund existing paths | return & refund ledger and ops workflows | Clear cancellation/refund at every fulfillment stage; real provider refunds only; shipping loss/damage paths | Sandbox/live refund evidence, reconciliation |
| P9 release | deployment docs, E2E, security | country-by-category launch matrix and runbook | Gate individual verified US/JP/CN slices; optional future countries | Provider contract, customs signoff, real tracked test order |

## D. API contracts (versioned, no browser-side customs authority)

### D1 `POST /api/public/product-preview` — suggested contract (not implemented)
Input: `{sourceUrl, destinationCountry, options:{sellerSku,color,size}, quantity, currencyPreference?}`. Auth optional. Output: `{previewId, merchant:{id,recognition}, variant:{evidence,fields}, missingFields, publicPrice:{amountMinor,currency,sourceAt}|null, importAssessment:{status,reasonCodes}, quote:{status,chargeBreakdown,expiresAt}|null, nextAction}`. Never expose internal fetching URL response body, authentication tokens, supplier private data or recipient identifiers. This is **preview** only; no order or purchase.

### D2 `POST /api/orders/quotes` — proposed authenticated verification flow
Input: server-owned `previewId`, immutable exact variant fingerprint, destination address reference, quantity, idempotency. Server rechecks source freshness, import eligibility, country shipping eligibility, cost and payer. Output: immutable signed/server-persisted `quoteId`, `verifiedStatus`, `expiresAt`, `charges[]`, `importerRole`, `incoterm`, `disclosures[]`. Reject `UNKNOWN` mandatory fees; no client-supplied HS/rate/duty can authorize payment. Existing `/api/purchases/[id]/checkout` must remain compatible until migration.

### D3 `GET /api/me/order-summary` — proposed
Return owned `activeOrders[]`, `actionRequired[]`, `lastConfirmedEventAt`, `packages[]`, `estimatedDeliveryWindow` only if supported by verified carrier/source, and MD recommendations separately. Cache only per user, no public DTO reuse.

### D4 Admin / asynchronous provider contracts
Use existing review/checkout and signed carrier gateways. For new adapters, use typed outputs `EXTRACTED/NEEDS_EVIDENCE/ACCESS_NOT_ALLOWED`; provider rates `VERIFIED/EXPIRED/UNAVAILABLE`; regulation decisions `ALLOWED_VERIFIED/REVIEW_REQUIRED/RESTRICTED/PROHIBITED/UNKNOWN`. Include source, version, expiry, reason and trace ID; never claim approved simply from successful fetch.

## E. Detailed guest and member state transitions

Guest: `LANDING -> CATEGORY/MD -> PRODUCT_OR_URL_INPUT -> OPTIONS_AND_DESTINATION -> PREVIEW`. If data missing: `NEEDS_REVIEW -> MANUAL_REQUEST`; login only required on saved address / committed request / payment. Keep 4 KiB / 24h one-tab draft constraint unless deliberately migrated through security review.

Authenticated new user: `LANDING -> DISCOVERY_PRIMARY + recent drafts`; no fake empty parcel progress. Signed-in with active purchase: `HOME -> ORDER_SUMMARY -> ORDER_DETAIL` with nested packages and event provenance, and MD below. `ACTION_REQUIRED` overrides cheerful in-transit display for customs/address/price-confirmation issues. Expired auth redirects to login and server rechecks; never assume client cookie claims ownership.

Delivery aggregate state derived from **independently persisted** sources; customer projection shows five phases but exact exception, order paid and each parcel state must remain visible in details. In cases of split shipment, global DELIVERED only after all required parcels have verified delivered events (or an explicit formally reconciled cancellation/partial delivery policy). Never infer delivery from ETA.

## F. Tariff algorithm / evidence requirements

Pure function boundaries: `classify(productEvidence, destination)`, `checkRegulatoryAdmissibility(variant, country, regime, importer)`, `selectEffectiveRules(country, hsNational, origin, regime, asOf)`, `buildAssessableValue(goods, shipping, insurance, discounts, regime)`, `computeDutiesAndTaxes(value, approvedRules)`, `buildLandedQuote(approvedCharges, fees, terms)`. These return structured Unknown/Review errors, not guessed numbers. Monetary components must specify currency, taxable basis and independently rounded components with rule version.

For legal review:
- US: HTSUS, origin and 2027 law effective date, additional duties by actual classification, cosmetic FDA rule ≠ food Prior Notice, metal derivatives by actual tariff list, appropriate entry route.
- JP: Japan 9-digit classification, post/courier/general, personal vs commercial, consumption/local tax and exclusions.
- CN: individual post/eligible CBEC/general; only verified positive-list/channel & transactions may claim CBEC relief; provider/broker review for data-flow.
- Cross-border: Korean VAT refund is **never** guaranteed margin; actual export/agent role needs tax advice; origin declaration backed by evidence.

## G. Shipment pricing optimization — exact objective

For candidate plan `p`: `fullyLoadedCost(p) = sum(carrierRate(parcel,zone,chargeableWeight,payer)) + domesticFreight + inspectionPacking + storage + insurance + brokerage + expectedReturnCost + confirmedCustomsCharges + paymentFXCosts`. Minimize subject to `import legality && carrierAcceptance && recipient consent && package compatibility && promisedEta && accurate declaration`. Carrier rates include fuel/remote surcharges; compare in single FX snapshot. Savings = separate fully-loaded cost - consolidated fully-loaded cost, **not** postage savings only. If rates unavailable, output `NO_VERIFIED_OPTIMUM` and await ops.

## H. Sample user journeys agents MUST demo

1. Guest opens /products, filter K-pop and browse MD without login, paste permitted merchant URL, select option and US; extraction has no material evidence => explain missing origin and request review, **not fabricated all-in price**.
2. Guest passes source URL, signs in with email or Google, returns to same draft exactly once; create request after server review.
3. Logged-in account with no orders sees MD; user with two in-flight parcels sees most relevant status and action-required banner; another user denied access.
4. Source product marked Korea-sold but Vietnam-origin; US rule selection uses VN origin; updated country tariff requires repricing for new checkout but does not mutate paid history.
5. China request tries to claim CBEC relief through unapproved postal route => blocked, manually reviewed.
6. Japan cosmetics personal-use claim vs resale: route distinctions and compliance hold.
7. Three orders from two merchants consolidate only when cheaper on real carrier cost and before SLA; two tracking numbers show separate parcel status when split.
8. Product unavailable after verified quote -> hold, informed consent, refund/alternative; no silent substitution.
9. Carrier sends stale out-of-order event and fake DELIVERED; signed fresh event required.
10. 2027 rule expiration at payment -> state remains review; no optimistic 0 taxes.

## I. Agent output requirement per PR

Each PR MUST contain: user-facing before/after, files changed, requirement IDs, why existing behavior is retained, schema migrations and rollback, source evidence updates, test IDs and actual logs, screenshots, accessibility results, remaining manual/legal/carrier dependencies. A UI PR should **not** silently activate checkout. Start with an ADR for importer-of-record, charge payer and principal-vs-agent legal model; absent decision, engineering can implement separate safe interfaces and tests without enabling paid orders.

## J. Precedence and versioning

Where old docs state V2 "customer dashboard removed", interpret as **current V2 state**, not permanent V3 product intent. New V3 target reinstates a **useful authenticated order summary** without restoring discarded LLM chat/legacy AI dashboards. Where old docs mention 10,000 KRW minimum, that is historical paid-quote policy, not current new-quote policy. Where earlier plans promised worldwide auto-DDP or live scraping, keep them deprecated. The source of truth for future requirements is SRS; code's present behavior still reflects STATUS until implementation merged and tested.