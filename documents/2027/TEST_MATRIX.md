# PayNShip 2027 — Verification Plan, SW/Test Traceability & Golden Fixtures

> **<u>HOME_HUB 초기 운영 및 여러 주문의 합배송 추천이 핵심 목표다.</u>** [자택 배대지·합배송 SRS](HOME_HUB_AND_CONSOLIDATION_SRS.md)에 있는 HUB/CON/GEO/OPS 요구사항과 TC-HUB/TC-CON/TC-GEO 테스트를 이 문서의 필수 하위 명세로 적용한다. 초기 3PL 계약은 필수 아님; 실제 운송사·통관/관세 증거 없는 절감액을 고객에게 확정 표시하지 않는다.

> **<u>업무 로직을 이후 단계로 미루지 말 것.</u>** [AUTO_ENGINE_ALGORITHMS_AND_WORK_PROCESS.md](AUTO_ENGINE_ALGORITHMS_AND_WORK_PROCESS.md)는 실제 구매처·3PL·합배송·통관/신고주체·DDP·운송사 후보를 알고리즘으로 평가하는 핵심 설계다. 해당 문서의 입력·후보 생성·총원가·제약검사·실행/실패복구 및 ENG-01~20 테스트가 이 문서의 추상적 표현보다 우선한다. **현재 제품 기능 구현 완료를 뜻하지 않음.**

> **<u>최상위 제품/사업 방향은 [역직구 컴파일러 + MD 헌장](PRODUCT_VISION_COMPILER_AND_MD.md)이다.</u>** 이 문서는 컴파일러의 일부 요구사항을 상세화하는 하위 문서다. 신규 API 개발이나 Day 0 목록을 목표로 삼지 말고, URL→상품 증거→국가별 관세/규제→DDP/배송 최적화→고객 총액·주문 상태, 그리고 MD 큐레이션으로 연결한다. 미구현 기능은 미구현으로 표시한다.


Status: **TEST SPECIFICATION — NOT EXECUTED** · 2026-11-21. Companion: [INTEGRATED_SRS.md](INTEGRATED_SRS.md).

## 1. Test strategy and evidence levels

Layer 0 — static policy/schema checks; Layer 1 — deterministic unit tests (money, HS/country, date boundary, classification, route); Layer 2 — integration contract tests (DB migration, auth/RLS, merchant adapters, checkout, provider events, carrier adapters); Layer 3 — Playwright guest / authenticated / operator scenarios; Layer 4 — staging with sandbox payment and sanctioned test 3PL/carrier/broker; Layer 5 — real, documented low-risk trial shipment by authorized ops. **Mock success never equals live carrier, customs or payment success.**

All real regulatory fixture values MUST carry: issuing authority, publicly accessible original URL or official licensed dataset, effective date/time and jurisdiction, importer and trade regime, HS national subheading, country of origin, composition, valuation inputs, source capture timestamp, verification date, human reviewer and approval reference. Fixture status DRAFT until signed review; changing rule data requires a second reviewer for high-risk rules.

Mandatory test nomenclature: `TC-<MODULE>-###`; name maps to a requirement ID, fixture ID and expected result. Keep failed/unknown test counts; never fabricate screenshots or CI results.

## 2. Detailed matrix — tariff & compliance

| Test ID | Requirements | Scenario / inputs | Expected |
| --- | --- | --- | --- |
| TC-CUS-001 | CUS-001 | WCO HS6 candidate only | National HS suffix **not** invented; quote blocked |
| TC-CUS-002 | CUS-001/002 | Same SKU, country US/JP/CN | Independently selected national tariff lines and rule versions |
| TC-CUS-003 | CUS-002 | Korean retailer + VN manufactured polo | Origin remains VN; never inferred KR FTA |
| TC-CUS-004 | CUS-002 | Origin changes post extraction | Invalidates former compliance/quote approval |
| TC-CUS-005 | CUS-003 | US courier vs postal vs applicable formal/informal entry | Distinct documented route and fees; no blanket formal-entry assumption |
| TC-CUS-006 | CUS-004/008 | 2027 regulatory effective-date T-1s / T / T+1s | Strict date-boundary version selection; stale rule rejected |
| TC-CUS-007 | CUS-004 | Origin-dependent additional measures and exclusions | Correct measures selected; no unsupported stacking |
| TC-CUS-008 | CUS-004 | Section 232-listed metal derivative vs unrelated cosmetic finished item | Tariff based on actual classified product and effective rule, not mere metal cap |
| TC-CUS-009 | CUS-005 | Currency changed KRW->USD->JPY with decimal conversions | No binary float drift; auditable rounding |
| TC-CUS-010 | CUS-005/006 | Goods, discount, insurance, freight components | Customs valuation assembled per regime; no one-size-fits-all CIF |
| TC-CUS-011 | CUS-006 | Duty 0 verified vs duty missing | 0 allowed only with explicit approved 0 rule; missing => UNKNOWN |
| TC-CUS-012 | CUS-007 | Generic lipstick | Cosmetic regulations checked; **no automatic food Prior Notice** |
| TC-CUS-013 | CUS-007 | Cosmetic sunscreen classified as drug where applicable | Drug review required |
| TC-CUS-014 | CUS-007 | Battery-powered wireless lightstick | Transport battery + RF compliance gates |
| TC-CUS-015 | CUS-007 | Food-contact mug | Appropriate food-contact review by country |
| TC-CUS-016 | CUS-007/012 | Prohibited or excluded trade category | No checkout/purchase/dispatch |
| TC-CUS-017 | CUS-008 | Expired source/broker evidence | Quote/buy/dispatch blocked; admin tick does not renew |
| TC-CUS-018 | CUS-008/014 | Unauthorized admin override | Forbidden and audited |
| TC-CUS-019 | CUS-009 | Quote paid, regulation subsequently changes | Financial snapshot unchanged; hold and change-management workflow |
| TC-CUS-020 | CUS-010 | User enters SSN in free text | Sensitive input not persisted to public logs/support or rejected as appropriate |
| TC-CUS-021 | CUS-011 | Shipment declaration vs order quantity | Mismatch blocked, correction workflow |
| TC-CUS-022 | CUS-012 | UNKNOWN/REVIEW_REQUIRED on either product or route | Payment blocked |
| TC-CUS-023 | CUS-013 | DDP unsupported carrier | UI cannot promise duty-paid; alternative approved DAP quote |
| TC-CUS-024 | CUS-014 | Rule edited | Immutable old decision, appended new audit evidence |
| TC-CUS-025 | CUS-015 | Scheduled source changes | Impacted open quotes marked review pending |

### Country-specific test extensions

| Test ID | Requirements | Scenario | Expected |
| --- | --- | --- | --- |
| TC-US-001 | CUS-003/004 | Legacy $800 threshold assumption | No automatic de minimis-free treatment under current applicable policy |
| TC-US-002 | CUS-004/008 | 2027 legal change boundary | New validated version only on actual effective date |
| TC-US-003 | CUS-007 | Imported cosmetic vs imported food | Prior Notice applies based on actual FDA food classification, not all cosmetics |
| TC-US-004 | CUS-001/007 | Polyester polo with unverified fiber composition | Cannot finalize HTSUS10 |
| TC-US-005 | CUS-002/004 | China-origin imported through Korea | Declared origin CN; transshipment evasion not assumed or encouraged |
| TC-JP-001 | CUS-003/007 | JP personal cosmetic vs commercial resale | Different restrictions and evidence |
| TC-JP-002 | CUS-003/005 | Japan postal shipment crossing applicable formal declaration threshold | Route/filing changes at official exact threshold |
| TC-JP-003 | CUS-004/006 | Simplified tariff exception item | General/special rate applied with authority |
| TC-JP-004 | CUS-006 | Japan national/local consumption taxes | Verified assessment and rounding, no guessed flat tax |
| TC-CN-001 | CUS-003/007 | CN personal mail vs CBEC vs general trade | Independent rule trees |
| TC-CN-002 | CUS-003/007 | Non-positive-list CBEC item | No CBEC preferential treatment |
| TC-CN-003 | CUS-003/010 | Missing qualified trade/financial/logistics records | CBEC not released |
| TC-CN-004 | CUS-005/006 | CBEC insurance/freight included as required | Right taxable base |
| TC-CN-005 | CUS-007 | Merchandise content restricted by import publication rules | Manual/legal gate |
| TC-CN-006 | CUS-003/008 | Personal limit or annual limit unknown | No fabricated preferential rate |

**Regulatory golden samples:** create initially *at least* 3 broker-verified cases per **country × approved category × channel actually offered**: ordinary low-risk, surcharge/exemption boundary, and exception/restriction case. Never claim 100% coverage of all national customs law. Store source-approved inputs and expected monetary breakdown as immutable fixture files in new controlled directory; placeholders are not executable legal truth.

## 3. Merchant URL/extraction tests

| Test ID | Requirements | Scenario | Expected |
| --- | --- | --- | --- |
| TC-URL-001 | URL-001 | Unapproved domain, http, username@host trick, unicode lookalike | Reject |
| TC-URL-002 | URL-001 | DNS rebinding, redirect to 169.254.169.254, private address, IPv6 internal target | Reject before fetch at every hop |
| TC-URL-003 | URL-001/009 | Oversized HTML, redirect loop, latency, timeout | Fail closed bounded |
| TC-URL-004 | URL-002 | HTML/JSON-LD prompt injection and script payload | Treated as data, sanitized, no instruction execution |
| TC-URL-005 | URL-003/005 | JSON-LD exact SKU+option+currency | Normalized exact identity |
| TC-URL-006 | URL-003/005 | Variant price differs from generic page price | Wrong price not used |
| TC-URL-007 | URL-003/005 | Member-only discount without eligible account | No public quote at member price |
| TC-URL-008 | URL-004 | Price evidence 25h old (24h policy) | Cannot finalize quote |
| TC-URL-009 | URL-005/006 | Missing origin, material or weight | NEEDS_EVIDENCE; no tax approval |
| TC-URL-010 | URL-007 | Robots/terms prohibit fetch (e.g., Naver observed) | No bypass or fetch; authorized feed/manual |
| TC-URL-011 | URL-008 | Musinsa layout changes fixture | Selector drift detected, manual request |
| TC-URL-012 | URL-008 | Daiso page product ≠ online-sale variant | Reject conflation |
| TC-URL-013 | URL-009 | Request bursts from one IP/account | Rate limiting; no DB or provider overload |
| TC-URL-014 | URL-010 | Customer edits quantity or price | Extracted evidence remains independent; quote invalidated |
| TC-URL-015 | URL-003/007 | Unsupported store or parser exception | Manual request preserves URL/variant/qty/destination |
| TC-URL-016 | URL-004 | Field-level evidence source conflict | Conflict logged; review instead of silent override |

**Research experiment:** For Naver/Musinsa/Daiso, sample 20 publicly/contractually accessible listings each, across categories and color/size cases; keep deterministic fixtures. Report denominators and site policy: % exact product ID, % option, % price, % stock, % origin, % composition, % parcel dims, % nationally verified HS, % verified all-in quote. An inaccessible page is an honest failure and MUST NOT be bypassed.

## 4. Customer/login/MD tests

| Test ID | Requirements | Scenario | Expected |
| --- | --- | --- | --- |
| TC-EXP-001 | EXP-001 | Guest enters /products and MD home | Browses without login |
| TC-EXP-002 | EXP-002/006 | Guest URL initial quote missing duties | Preview clearly says Needs review; no payment |
| TC-EXP-003 | EXP-003 | Guest draft -> Google/email login -> return | Safe draft preserved once with exact SKU/qty |
| TC-EXP-004 | EXP-003 | Attacker changes draft user ID / replay | Ownership check, no PII leak |
| TC-EXP-005 | EXP-004 | Signed-in no order | MD and start purchase primary |
| TC-EXP-006 | EXP-004 | Signed-in active order | Own order ETA/status top and catalog below |
| TC-EXP-007 | EXP-004/ORD-005 | Order needs customer authorization | Action required prioritized with clear next action |
| TC-EXP-008 | EXP-005 | Color/size changed | Stock/price/tax proof reset |
| TC-EXP-009 | EXP-008/011 | 320/375/768/1440 widths, keyboard, screen reader | No traps/clipped totals; accessible forms |
| TC-EXP-010 | EXP-009 | Editorial false "lowest in US" claim | Rejected absent dated identical-SKU matching evidence |
| TC-EXP-011 | EXP-010 | Currency/locale zh/ja/en/ko | Correct formatting and explicit price base, no tax text ambiguity |
| TC-EXP-012 | ORD-002/004 | User A requests user B order URL | 403/404, no tracking/PII leak |
| TC-EXP-013 | EXP-004 | Expired auth session mid-checkout | No lost untrusted draft; final server revalidates |

## 5. Money, payment, returns and authorization tests

| Test ID | Requirements | Scenario | Expected |
| --- | --- | --- | --- |
| TC-PRC-001 | PRC-001 | Goods 20,000 KRW | Fee 3,000 KRW; **no 10,000 min** |
| TC-PRC-002 | PRC-001 | Existing paid legacy order | Paid sum unchanged |
| TC-PRC-003 | PRC-002/003 | Broker charge unspecified | Missing charge displayed; cannot pay |
| TC-PRC-004 | PRC-004 | Customer changes country/address/quantity | Quote invalidation/recompute |
| TC-PRC-005 | PRC-005 | Forged payment webhook, mismatch currency/order | Reject; audit without secrets |
| TC-PRC-006 | PRC-005 | Duplicate paid callback | Exactly one transition and ledger record |
| TC-PRC-007 | PRC-004 | Quote expires between UI and server submit | Reject and re-quote |
| TC-PRC-008 | ORD-006 | Paid and purchase not yet executed | Refund policy stage, actual provider refund proof |
| TC-PRC-009 | ORD-006 | Purchase already sent, customer requests cancel | Human/vendor policy check; statutory rights unaffected |
| TC-PRC-010 | ORD-006 | Chargeback duplicate/late callback | No double refund, ledger reconciliation |

## 6. Multi-shipment / logistics tests

| Test ID | Requirements | Scenario | Expected |
| --- | --- | --- | --- |
| TC-SHP-001 | ORD-001/SHP-002 | 3 seller purchases, one recipient | Candidate consolidation, maintain item-level chain |
| TC-SHP-002 | SHP-002 | Volumetric weight bigger after consolidation | Correct billable weight and rate; may reject consolidation |
| TC-SHP-003 | SHP-003 | Different recipient identity/address | Cannot combine silently |
| TC-SHP-004 | SHP-003 | Mixed dangerous/restricted and normal goods | Incompatible shipping blocked |
| TC-SHP-005 | SHP-002 | Consolidation delays one urgent shipment beyond promised window | Explain delay and require policy-compliant choice |
| TC-SHP-006 | SHP-001/004 | Carrier rates outdated or missing surcharge | No false cheapest-route claim |
| TC-SHP-007 | ORD-004 | Signed tracking event repeated | Idempotent append; no duplicate customer notification |
| TC-SHP-008 | ORD-004 | Out-of-order "in transit" after delivered | Monotonic delivery projection, raw events preserved |
| TC-SHP-009 | ORD-004 | Unsigned "delivered" event or manual operator flag | Never mark delivered |
| TC-SHP-010 | ORD-001/004 | Two packages from one order | Per-parcel timeline, aggregate order completion only if all required parcels delivered |
| TC-SHP-011 | ORD-005 | Customs hold / address correction | Exception + customer action and audit; no completed claim |
| TC-SHP-012 | SHP-005 | Carrier API offline > SLA | Show last confirmed update timestamp; alert staff |
| TC-SHP-013 | SHP-002 | Separate vs combined cost includes storage, packing and customs | Compare net total, not postage alone |
| TC-SHP-014 | SHP-003 | Any plan changes invoice/item quantity/origin for duty avoidance | Reject |

## 7. Architecture / data tests

- Database migration from populated baseline, NULL/old `Product.hsCode`, legacy `Quote/Order/Chat` preserved; dry-run backup/restore and rollback rehearsal.
- Check FK constraints and order-item/parcel cardinalities, concurrent version updates, duplicate idempotency keys, outbox atomicity, poison messages and retries.
- Encrypted PII at rest and in backup; RLS/app-level tenancy: user A cannot read B, operator role granular, audit of decrypted-view.
- URL source snapshots and customs evidence digests tamper-evident; admin cannot generate `PROVIDER_VERIFIED` without actual provider proof.
- Performance budget target (initial hypothesis, adjust after baseline): p95 catalog first render < 3s on representative mobile, p95 URL submission < 1s for validation, external extraction asynchronous, tracking read p95 < 1s after cache. Capture hardware/network before claiming pass.
- Operational resilience: FX feed unavailable, official tariff provider unreachable, webhook duplication, storage outage, payment timeout; no double-charge or default-zero tariff.
- Privacy/retention/DSAR and customer service, statutory return rights by geography; restore encrypted data with key-rotation test.

## 8. Release evidence checklist

- [ ] All P0 traceable to merged code and executable test results, with remaining P1 deferred visibly.
- [ ] Canonical service fee inconsistency resolved in docs/code/tests.
- [ ] 2027 country/regime official tariff sources verified with effective dates and broker sign-off; no placeholder approved fixture.
- [ ] 3+ approved golden cases per launched country/category/channel.
- [ ] Owner auth, admin MFA, PII controls, idempotency and webhooks tested in staging.
- [ ] Real payment settlement/refund and reconciliation test documented.
- [ ] Real 3PL and at least one carrier routing/track/return rehearsal documented, including taxes/fees actually charged.
- [ ] Live merchant feed/permission contracts confirmed; inaccessible sources use manual review.
- [ ] Accessible guest, signed-out, signed-in no-order, active-order and action-required flows tested.
- [ ] Customs hold, lost parcel, damaged goods, address correction, out-of-stock and wrong-item playbooks reviewed.
- [ ] On-call runbook, source change monitoring, exception metrics, rollback and feature flags ready.
- [ ] Real route-specific user disclosures of DDP/DAP, unexpected charges, refund rights and delivery estimates reviewed.
- [ ] `npm run type-check`, `npm run test:ci`, `npm run build`, `npm run docs:check` and Playwright suite run after relevant changes with recorded commit SHA.

## 9. Suggested evidence format

```json
{
  "fixtureId": "US-APPROVED-EXAMPLE-001",
  "status": "DRAFT_NOT_LAW",
  "country": "US",
  "importChannel": "COURIER",
  "productSku": "EXACT_SKU",
  "origin": "VN",
  "hsNationalCode": null,
  "customsValueMinor": null,
  "currency": "USD",
  "taxesAndFeesMinor": null,
  "effectiveAt": null,
  "sourceAuthority": null,
  "sourceUrl": null,
  "verifiedBy": null,
  "expectedOutcome": "REVIEW_REQUIRED"
}
```

Do not pass a sample fixture whose expected duty is zero unless the official rule and broker expressly approve zero for the specified route.
