# PayNShip 2027 — Integrated Product & Software Requirements (SRS)

Status: **PROPOSED / NOT IMPLEMENTED** · Version: 1.0 · Authored: 2026-11-21 · Repository: `DongHeeKw/paynship-dh2`

> This is a delivery contract for a coding agent, not a declaration that 2027 tariffs are finalized or that the current deployment is production-ready. No product may be advertised as customs-cleared or duty-paid without current, auditable evidence.

## 0. Intent, scope, non-goals

**Vision:** Customer chooses item, variant, quantity, destination and consents to an all-in quote; PayNShip orchestrates sourcing, purchasing, compliance, warehousing, consolidation, shipping, tracking and post-sale. Abstract **choices**, not material facts or customer rights. Show total cost (or explicitly unconfirmed charges), delivery window, restrictions, import-payment responsibility, shipping status, refund terms and provenance. Do not claim guaranteed delivery or automatic customs clearance.

**Countries in this release:** US, JP, CN. Additional destinations remain manual/broker review unless separately approved. Russia is research-only: payment, sanctions/export-control and operational verification are prerequisites. Excluded from initial trade: food, agriculture/animal products, medicines, alcohol and tobacco (existing business scope), regardless of their legal status in a particular jurisdiction. Cosmetics, electronics, toys and food-contact products require elevated review.

**Goals (measured):** customer can browse curated MD products without auth; URL preview without auth; authenticated owner sees their active order first without losing catalog; no false tax/delivery claims; trustworthy country/version-specific quote; multi-item shipping planning while preserving accurate declarations; secure owner-scoped timeline; manual fallback when extraction and regulations are uncertain.

**Out of scope:** unauthorized crawling or bypass of merchant protections; auto-buy at merchant sites absent approved contract; automatic customs filing or broker substitution; broad international DDP claims; automatic customs classification with binding legal effect; any live carrier/payment/provider integration without credentials, test contract, privacy/terms review.

## 1. Baseline confirmed from repository (2026-11-21)

- README: Node >=24, Next.js 15, Prisma/PostgreSQL, Supabase Auth, Shopify hosted payment, service fee **15% merchandise subtotal, no minimum**. Legacy paid quotes immutable. `npm start app` local runner; Vercel is a separate deployment path.
- `PurchaseRequest` has single source URL, quantity/options/destination, idempotency/version, quote, carrier/tracking and events. Current schema alone does **not** represent a many-item order / several domestic purchases / split packages.
- `Product` legacy fields include `hsCode`, `origin`, `material`, `dataSources`, `overallConfidence`; these are **not** official country-specific classifications.
- `documents/Features/STATUS.md`: 8 curated seller references; limited JSON-LD/CSS extraction; URL preflight is not live verification; product evidence dates do not refresh on deploy; Naver blocks crawling via robots; no current verified public all-in catalog, live carrier/broker, full refunds or verified end-to-end production checkout.
- `documents/Reference/COUNTRY_CUSTOMS.md`: policy recheck deadline 2026-11-11 has elapsed; existing gate correctly blocks approvals. Do not silently extend expiry.
- **Documentation drift:** README and STATUS specify no minimum service fee, while part of OPERATIONS.md still says KRW 10,000 minimum. Canonical rule for new quotes is **15%, no minimum** until formally changed; remove/flag stale contradictory wording in a separate reviewed change.
- Existing protection (owner checks, encrypted PII, limited identifiers, signed provider events, idempotent webhook processing, versioned state, admin MFA, NO fake shipment delivered, NO unknown customs cost as zero) is a **non-regression requirement**.

## 2. Personas / jobs to be done

- Guest: browse relevant Korean goods with transparent sourcing; paste a merchant URL; select destination, variant/quantity; receive **preview** and missing-information explanation; sign in at commit point and resume an immutable verified draft.
- New signed-in: begin shopping and track any past request; no empty shipping dashboard blocking the catalog.
- Signed-in with active order: latest active orders and action-required alerts are top content; personalized MD suggestions follow; self-service tracking/CS.
- MD operator: approve product evidence, categories, identity, recommendation rationale and country eligibility; cannot override compliance without audited review.
- Sourcing/warehouse operator: actual purchase and intake evidence, damage photos, storage, splitting/combining within permission and compatibility checks.
- Compliance/broker: verify origin, HS suffix, regime, declared value, import compliance, importer roles, permits, effective tariff rules and charge evidence.
- Support/admin: exceptions, returns, refunds, SLA; least privilege and PII audit.

## 3. Functional requirements — storefront, authentication, MD

| ID | Priority | SHALL requirement | Acceptance / notes |
| --- | --- | --- | --- |
| EXP-001 | P0 | Public `/products` and MD home remain accessible without authentication. | No auth prompt for browsing; no private metadata leakage. |
| EXP-002 | P0 | Public URL preview takes merchant HTTPS URL, country, selected variant/quantity and does not assert product real/available or customs cleared until verified. | URL parsing distinct from evidence and quote approval. |
| EXP-003 | P0 | Preserve guest draft over sign-in callback, verify tamper protection, ownership, expiry and canonical URL; do not persist recipient PII before consent. | Cross-account and replay tests. |
| EXP-004 | P0 | Home resolves `guest`, `authenticated_no_active_order`, `authenticated_active_order`, `action_required` states; active order goes first; MD never disappears. | Same responsive navigation; accessible keyboard/screen reader. |
| EXP-005 | P0 | Per-item variants and quantity are exact SKU/color/size identities; changing variant invalidates inventory, price, compliance and shipping quote where applicable. | No merging near-match SKUs. |
| EXP-006 | P0 | Guest preview clearly labels preliminary vs verified; no checkout CTA with unknown mandatory duty/clearance fee. | Unknown is not zero. |
| EXP-007 | P1 | Admin MD may publish/unpublish editorial collections and evidence-backed selection reason (Korea-only, limited, discount verified, etc.). | Avoid unverified claims such as "cheaper than the US". |
| EXP-008 | P1 | MD storefront offers search, category/brand/country availability filters, pagination, no-results/loading/error states and reliable deep links. | Browser history retained. |
| EXP-009 | P1 | Product pages show up-to-date observation timestamp, country of manufacture when verified, local price, estimated landed cost and stock uncertainty. | Expired evidence withheld from approved quote. |
| EXP-010 | P1 | Language/localization supports ko/en/zh/ja UX with currency and dates distinctly formatted and legal translation reviewed. | Do not auto-translate terms as legal certification. |
| EXP-011 | P1 | Use KRDS principles: design tokens, typographic scale, accessible contrast, form validation, card/list and progress pattern; **not** copying government branding. | 320–1440px, WCAG 2.2 AA target. |
| EXP-012 | P1 | Login is a means to order/track, never a prerequisite to discovery. | Same checkout journey when entering via MD or pasted URL. |

## 4. Functional requirements — URL orchestration / evidence

Pipeline: `URL_ACCEPTED -> MERCHANT_RESOLVED -> PRODUCT_IDENTIFIED -> VARIANT_RESOLVED -> EVIDENCE_EXTRACTED -> EVIDENCE_VERIFIED -> CLASSIFICATION_REVIEWED -> IMPORT_ELIGIBILITY_REVIEWED -> QUOTE_READY`; any uncertain step -> `MANUAL_REVIEW_REQUIRED`, with a human-readable reason and retained draft.

| ID | Priority | SHALL requirement |
| --- | --- | --- |
| URL-001 | P0 | Canonicalize merchant URL; HTTPS-only explicit hostname/path allowlist; validate redirects and DNS at each hop; block localhost, link-local, private, metadata IP and alternative encodings; enforce resource size/timeouts, no arbitrary fetch. |
| URL-002 | P0 | Treat retrieved HTML/structured data as untrusted. No page text as execution instructions; sanitize output; prevent script/HTML injection. |
| URL-003 | P0 | Merchant adapters implement same typed interface `resolve, extract, normalize, evidence`; fallback for authorized JSON-LD/Open Graph/CSS, then customer/manual request. |
| URL-004 | P0 | Store per-field provenance: merchant URL, capture time, extraction method, source revision/evidence digest, confidence, who approved and expiration. |
| URL-005 | P0 | Verify SKU/model/color/size/currency, membership coupon exclusions, shipping charge and stock; missing information is `UNKNOWN`, not inferred. |
| URL-006 | P0 | URL extraction MUST NOT automatically invent manufacturing origin, weight, HS tariff line, country-specific eligibility or tariff value. |
| URL-007 | P0 | If merchant rejects automated access or terms/robots disallow it, do not evade; use authorized feed/API/affiliate data or customer/manual entry. |
| URL-008 | P1 | Per-site adapters for Naver, Musinsa, Daiso only **after** legal/technical access review; versioned fixtures and selector drift detection. |
| URL-009 | P1 | Rate limiting, circuit breaker, cache TTL, retry with bounded exponential backoff and operational metrics without user PII in logs. |
| URL-010 | P1 | Manually edited evidence is distinct from automatically observed evidence; customer-provided price is indicative only. |

**Reverse engineering Delivered Korea:** Allowed public black-box study of customer-facing flow, input prompts, fallback and status semantics; not access-controlled APIs or private logic. Public flow has automatic URL load **attempt** then manual request and human quote; do not treat competitor frontend as proof of customs data extraction. Create permission-respecting 20-item/site fixtures across Naver/Musinsa/Daiso and measure identification, exact variant, price, stock, origin/material/weight evidence, classification readiness, verified quote readiness and failure reasons. Segment by mobile/desktop, guest/member pricing and store region where legally usable.

## 5. Functional requirements — customs, tax, compliance

Model **separate layers**: (1) product identity and physical composition, (2) customs classification with country/version, (3) import regime, (4) regulatory admissibility, (5) assessed customs valuation and duty/tax, (6) carrier/broker clearance costs, (7) user-facing quote. Never encode "HTS = customs allowed."

| ID | Priority | SHALL requirement |
| --- | --- | --- |
| CUS-001 | P0 | Store WCO HS6 as **candidate**, verified country-specific US HTSUS10, JP import statistical number9 and CN tariff classification separately; provenance/approver/effective dates. |
| CUS-002 | P0 | Keep seller country, dispatch country, country of **manufacture/origin** and FTA preferential origin distinct; origin must have documentary evidence. |
| CUS-003 | P0 | Import channel/regime required: US post/courier/formal/informal as relevant; JP post/courier/general; CN personal mail/approved CBEC/general trade. |
| CUS-004 | P0 | Tariff rule records include base/ad valorem and specific duty, origin-specific additional measures, exemptions and exceptions, start/end dates, rounding and official citation. No hard-coded 2027 duty rate. |
| CUS-005 | P0 | Valuation stores goods transactional value, currency, importer, Incoterm, freight/insurance where includable, discount, quantity, declared value and assessment basis by regime. Decimal/integer minor units only. |
| CUS-006 | P0 | Calculate independently: customs duty, additional duty, VAT/consumption tax, brokerage, advancement/clearance, handling, freight, insurance, FX and payment charges; specify whether each is included, excluded or awaiting verification. |
| CUS-007 | P0 | Compliance rules are product & channel-specific: FDA/MoCRA etc., CPSC/FCC, JP Pharmaceuticals and Medical Devices Act, PSE/radio/food contact, CN NMPA/CCC/CBEC eligibility/publication/content rules as applicable; unknown -> review. |
| CUS-008 | P0 | Source every rule to official authority, last checked, legal effective date, next review date, verified broker/legal review as needed. Expired high-risk rules block quote/buy/dispatch. |
| CUS-009 | P0 | Evaluate again at checkout, before purchase, before dispatch and on release from hold; preserve existing paid-quote financial history, use explicit adjustment/consent/refund flow. |
| CUS-010 | P0 | Shipment/importer identity and required authorizations are country/channel-specific; minimize personal identifier collection; broker secure-channel path rather than general profile fields. |
| CUS-011 | P0 | Required customs fields and signed invoices must reflect actual SKU/quantity/value/origin; never relabel Chinese-made products as Korean origin. |
| CUS-012 | P0 | Distinguish `ALLOWED_VERIFIED`, `REVIEW_REQUIRED`, `RESTRICTED`, `PROHIBITED`, `UNKNOWN`; only current approved verified chain may unlock payment. |
| CUS-013 | P1 | DDP/DAP eligibility depends on specific carrier contract, importer-of-record arrangement and destination rule; disclose who pays on arrival. |
| CUS-014 | P1 | Audit every rule lookup, decision and manual override with before/after, approver, input snapshot and rule hash. Overrides never silently bypass prohibited categories. |
| CUS-015 | P1 | Automatic rule impact report on 2027 tariff changes and scheduled rule-source review; pause affected unapproved quotes, notify ops. |

### Country policy overlays — do not guess 2027 rules

- **US:** 2025 de minimis policy change and any 2027 law/effective-date changes must be time-versioned; HTSUS10, origin-specific measures, Section 232 derivative list and metal composition as relevant, formal vs informal entry, FDA import regulations (food Prior Notice ≠ universal cosmetics Prior Notice), MoCRA/cosmetic label, applicable CPSC/FCC, importer/broker and duty payer. Keep legal measures separate, do not stack incompatible measures blindly. Official sources: https://hts.usitc.gov/ ; https://www.cbp.gov/ ; https://www.fda.gov/ .
- **JP:** JP9, valuation, small consignment exceptions and simplified rates with exclusions, post/courier/general route, duty + national/local consumption tax, personal-use vs resale, PMD Act cosmetics, PSE/radio and food-contact rules. Official sources https://www.customs.go.jp/english/tariff/ and https://www.customs.go.jp/english/ .
- **CN:** distinguish personal postal import, CBEC on approved positive-list/platform and standard general trade; CBEC discount rates and purchase limits must only apply after eligibility and data integration are verified; three-order/payment/logistics records and recipient authorization as demanded; valuation may include freight/insurance; NMPA/CCC and content restrictions where applicable. Official source https://online.customs.gov.cn/ ; broker validation mandatory before launch.

**Regulatory caveat:** This SRS is not a live legal database. As of 2026-11-21, 2027 tariff schedules, exclusions and trade measures may change. Do not fill tariff tables from this prose. Compliance owns approved, dated authoritative fixtures.

## 6. Functional requirements — quoting / pricing

| ID | Priority | SHALL requirement |
| --- | --- | --- |
| PRC-001 | P0 | New quotes honor merchandise subtotal * 15% and no minimum, unless formal versioned business decision changes it; legacy paid amounts stay immutable. |
| PRC-002 | P0 | Quote has line items with source evidence and currency: goods, domestic ship, purchasing fee, warehouse/pack, international freight, customs duty, import tax, brokerage/advancement, insurance, payment/FX, promo. |
| PRC-003 | P0 | Explicit `ESTIMATE`, `VERIFIED_QUOTE`, `EXPIRED`, `ON_HOLD`, `PAID`; no total presented as final if mandatory costs unknown. |
| PRC-004 | P0 | Quote pins variant/SKU/quantity/destination/address-relevant zone, route, rule-version hash, source and FX timestamp; any mutation revalidates. |
| PRC-005 | P0 | No payment request unless approved duty/tax/clearance evidence meets country gate, signed provider callbacks match exact amount/currency/order, recipient data valid. |
| PRC-006 | P1 | Show customer decision inputs but not carrier-selection complexity; allow "fast" alternative only if grounded SLA and pricing. |
| PRC-007 | P1 | Price competitiveness claims require matched SKU+size/color, overseas stock/current price and independently computed landed cost, with dated sources. |

## 7. Orders, tracking, fulfillment and freight optimization

| ID | Priority | SHALL requirement |
| --- | --- | --- |
| ORD-001 | P0 | Support future `Order -> OrderItems -> DomesticPurchases -> WarehouseReceipts -> ShipmentGroups -> Packages -> TrackingEvents` with backward-compatible mapping from existing `PurchaseRequest`. |
| ORD-002 | P0 | Customer dashboard displays verified order progress and last verified event time, not inferred carrier events; action-required shown separately. |
| ORD-003 | P0 | Customer-facing timeline: Confirmed, Purchasing, Preparing, In transit, Delivered. Internally preserve inventory/warehouse/customs/exceptions and tracking details. |
| ORD-004 | P0 | Tracking owner authorization, signed provider event, deduplication, out-of-order monotonic state, multi-package support. No admin fake delivered. |
| ORD-005 | P0 | Purchase exception: out-of-stock, price changed, quality failure, customs hold, restricted item, address correction, failed delivery; trigger human approval / refund path. |
| ORD-006 | P0 | Customer cancel/refund eligibility is explained before payment, with distinction before purchase / after purchase / shipped; statutory rights override store policy. |
| SHP-001 | P0 | Carrier adapters accept origin, destination, parcel dims, actual vs volumetric weight, incoterm, restrictions, ETA range, surcharge, insurance and tracking capability. |
| SHP-002 | P0 | Compare separate vs consolidated packages including domestic transport, warehouse days, inspection/repacking, chargeable weight, customs, broker fees, SLA and legal reporting. |
| SHP-003 | P0 | Do not combine packages belonging to different recipients without explicit lawful authorization, or incompatible/restricted goods. Splitting/combining must not evade import duty or make false declarations. |
| SHP-004 | P1 | Consolidation planner records objective function (cost vs deadline), confidence and fallback; before customer-facing promise require actual 3PL/carrier tariffs. |
| SHP-005 | P1 | Carrier webhook/reconciliation, proof-of-delivery, insurance claims, lost parcels and return logistics. |
| SHP-006 | P1 | Operational telemetry on effective shipping cost per order, on-time rate, consolidation savings NET of delays and returns, damage rate. |

## 8. Data schema / migration principles

Suggested **new** entities: `Merchant`, `MerchantAdapterRevision`, `ProductEvidence`, `VariantIdentity`, `CuratedCollection`, `CountryTariffClassification`, `TradeRuleVersion`, `ImportEligibilityDecision`, `QuoteSnapshot`, `OrderItem`, `DomesticPurchase`, `WarehouseReceipt`, `ShipmentGroup`, `ShipmentPackage`, `CarrierRateEvidence`, `TrackingEvent`, `ReturnCase`, `RefundLedger`, `AuditDecision`. Separate immutable observed evidence from editable MD content and from broker-approved classification.

Rules:
1. First inspect current Prisma migrations and relations; **do not drop historical Quote/Order/Chat/User data**. Additive migrations with compatibility layer, backfill rehearsal and rollback plan.
2. Separate legacy `Product.hsCode` (unverified) from verified classifications. Never auto-migrate candidate to verified.
3. Store monetary amounts in integer minor units/decimal, not JS float for customs financial calculation; currency and rounding mode per jurisdiction.
4. Normalized source URLs never serve as sole variant identity; preserve seller ID, exact SKU and variant fields.
5. Order and customs snapshots are immutable after paid. Use append-only audit/reconciliation events and explicit corrections.
6. Encrypt PII and sensitive document references, least privilege, retention/deletion policies; no SSN in free-form support notes.
7. Idempotency keys for merchant purchase, payment, refund, carrier booking and provider callbacks; optimistic concurrency/version checks.
8. Queue/outbox for side effects, bounded retries, poison-event review, no double orders.
9. API errors use typed error codes `NEEDS_EVIDENCE`, `RULE_EXPIRED`, `CARRIER_UNAVAILABLE`, `PRICE_CHANGED`, `REQUIRES_BROKER`, `NOT_ELIGIBLE`, `ACTION_REQUIRED` and non-sensitive messages.

## 9. Core acceptance, release gates, priorities

**P0 release blocker** means verified route for selected US/JP/CN product and merchant, not blanket country launch. Complete only an approved country/category slice first.

- A guest can browse MD, inspect supported URL preview without login; sign in and resume a safe draft.
- An authenticated customer sees their owned active order/required action first; all customers still see MD; another account gets 403/404 and no data.
- Every quote references exact SKU, origin evidence, route, policy version, approved charges; unknown required charge blocks checkout, never defaults to zero.
- Verified country+channel+category combinations only; expired customs evidence cannot be approved through operator UI.
- Each order has accurate paid value and receipts; signed external delivery event alone can complete shipment; refund requires provider confirmation.
- Automated source adapters respect access restrictions; failure produces manual fallback, not fabricated data.
- Country-specific reference golden cases approved by compliance/broker. E2E real payment, customs, 3PL/carrier and return rehearsals recorded before production promotion.
- Security/load/accessibility/privacy tests pass; regulatory review signoff and ops runbook signoff are explicit.

### Open decisions (DO NOT silently choose)

1. Legal trade role: principal seller/exporter vs agent; importer of record and who pays import charges by destination.
2. Approved 3PL and carrier(s), rate cards, limits, delivery SLA and DDP/DAP support.
3. Site permissions/feeds: Naver, Musinsa, Daiso; terms, robots and API contract.
4. First live category, first target country and exact verified SKU set.
5. True landed-price promise vs pre-checkout estimate and cost-change adjustment policy.
6. Customer refund policy, statutory rights, insurer/parcel claims and chargeback process.
7. Golden case approvers and verified 2027 official customs datasets.
8. Currency/exchange margin, service fee versioning and combined-purchase fee policy.
9. Localization and CN CBEC integration partners / recipient verification.
10. Warehouse hold duration, consolidation consent and deadline tradeoff.

## 10. Agent handoff

Follow `documents/2027/AGENT_IMPLEMENTATION_PLAN.md` and `documents/2027/TEST_MATRIX.md`. Do not implement regulatory decisions from memory; attach authoritative cited rules, effective dates and signed approval. Each PR must reference requirement IDs, test IDs, migration and rollback implications, screenshots of guest/signed-in behavior, and verify with `npm run type-check`, `npm run test:ci`, `npm run build`, `npm run docs:check`, appropriate Playwright tests. Report actual results only.

**Source reading list:** `README.md`, `documents/PRODUCT_SPECIFICATION.md`, `documents/Features/STATUS.md`, `documents/Reference/TAX_AND_CUSTOMS.md`, `documents/Reference/COUNTRY_CUSTOMS.md`, `documents/Reference/OPERATIONS.md`, `documents/Features/Pricing/Spec.md`, `features/storefront/README.md`, `prisma/schema.prisma`.
