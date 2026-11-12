# Pricing and product estimates

Updated: 2026-11-13. Applies to `DongHeeKw/paynship-dh2`. The owner approved **15% of the product subtotal, minimum KRW 10,000 per retailer order**. Shipping, insurance and import charges are separate. This is a service-fee policy, not a profit margin or tax rate.

## Fee and exact arithmetic

`lib/purchases/service-fee.ts` is shared by the public calculator and new server quotes. Product subtotal is the actual price after seller discounts multiplied by quantity, excluding shipping/import charges. Do not subtract hypothetical Korean VAT refunds.

```text
product subtotal KRW = verified unit price KRW × quantity
service fee KRW = max(10,000, round-half-up(product subtotal KRW × 15 / 100))
```

A zero-value calculator basket has no fee. Actual requests require a positive price. Round the fee once to whole won, then convert fee and product subtotal separately to USD cents at the reviewed KRW-per-USD rate. `money.ts` uses integer/BigInt ratios and half-up rounding. The total equals its rounded line items. Customer/operator fee overrides do not control new quotes.

One request currently contains one product and its quantity and represents one retailer order. The minimum applies once to that subtotal, never once per unit. Multi-product checkout across separate requests is **not implemented**. `allocateServiceFeeKrw` supports exact future grouped-line allocation using largest remainders; allocations sum to one order fee. It does not create a cart. If operations combine requests into one retailer checkout, a reviewed grouping/refund workflow is needed before charging to avoid repeated minimums.

New quotes record the policy ID, KRW fee and FX rate. Existing stored/paid quotes are not rewritten. Paid legacy revalidation retains the historical fee/arithmetic, and all paid line items must match. Changed costs require support/refund resolution.

## Before-login estimates

`CostPreview` in `/purchase` lets a visitor enter a seller unit price to calculate product + service immediately. This is labelled customer-supplied, is not persisted, and cannot authorize checkout. Changing URL/options clears it. Unknown freight, insurance, duty, tax or clearance is `null`, displayed as **Needs review**, never zero. The delivered total stays unavailable while evidence is missing.

Automatic estimates use the public operator-reviewed [catalog](../../../data/catalog/public-prices.json). It is initially empty: this deployment does not invent live prices, tariff tables or carrier contracts. `publicPriceCatalogSchema` and lookup live in `lib/purchases/public-estimate.ts`.

Entries match canonical URL **and exact options**; routes also match destination and quantity. A larger quantity never reuses a smaller shipment's transport/tax amounts. Duplicate matches, missing amounts, future/stale evidence or expiry require review. Evidence windows are at most 24 hours; expiry is the earliest product/freight/customs expiry. The browser checks freshness every 30 seconds. This display is not checkout authorization.

Automatic catalog routes cover Korea shipments to the **USA, China and Japan**. Existing destination/history records and wider manual request list remain intact. Shipping from Korea and product manufacturing origin are different facts.

## Publishing verified data

1. Collect permitted seller evidence with the existing bounded operator collector or an authorized merchant feed. Never bypass robots, authentication or anti-bot controls. A blocked lookup stays unknown.
2. Identify exact SKU/model/size/colour. An explicitly inapplicable attribute is `null`, not a guessed value. Write an unambiguous `options` string; use `No variants` for a verified single-option product.
3. Verify current discounted unit price, KRW currency and availability. Add an evidence reference, verification time and expiry within 24 hours.
4. Obtain carrier and broker/customs assessments for the packed shipment. Record product origin, material, tariff code, packed grams and mm dimensions, carrier, import regime and exact quantity. Product dimensions are not automatically packed dimensions.
5. Enter every approved whole-won amount: domestic/international freight, insurance, duty, tax and clearance. Zero also needs evidence. The referenced assessment must explain statutory valuation, destination-currency rounding and FX conversion into KRW. A generic USD percentage does not establish those facts.
6. Publish only non-personal public facts and public evidence references. Never publish addresses, IDs, private invoices, signed URLs or credentials. Validate the schema and review the change before deployment.

Each product requires `sourceUrl`, `sku`, `name`, `options`, `size`, `color`, `model`, `unitPriceKrw`, `productEvidence` and `routes`. Each route requires the monetary/assessment fields in the schema. Missing charges fail validation. A test validates the deployed file; invalid catalog data falls back to no published prices in the UI.

This is a reviewed-data ingestion boundary, not a live merchant integration. Operations/an authorized integration must refresh expired records. Merchant access, contracted freight and licensed customs data remain necessary for reliable automation of arbitrary links.

## Server quotes and country calculations

New US/CN/JP quotes require `verifiedImportCharges`: explicit USD-cent duty, tax and clearance. The operator documents carrier/broker/customs evidence and conversion in the review. These amounts **replace** the generic tax formula; they are not added twice. Clearance is a separate customer/hosted-payment line. Category/HS service scope, evidence dates and recipient checks remain required.

The old reviewed CIF/FOB ad-valorem calculation remains for historical revalidation and other reviewed routes. It does not fully implement thresholds, additional duties, excise, specific duties, local rounding or special import regimes. Unsupported calculations require review. Provider-confirmed amounts and ownership still gate payment.

Research reviewed 2026-11-13:

| Market | Required review |
| --- | --- |
| USA | Entry method, classification, origin, additional duties and fees. Do not apply the old universal USD 800 exemption. [2026 federal rule](https://www.govinfo.gov/content/pkg/FR-2026-06-24/pdf/2026-12670.pdf). |
| China | Establish the import channel and eligibility before cross-border retail treatment; registration and transaction/payment/logistics records matter. [China Customs procedure](https://online.customs.gov.cn/static/pages/guides/000629020000/000629020000.html). |
| Japan | Valuation, exceptions, tax categories and effective dates; do not blindly apply a multiplier or exemption threshold. [Japan Customs](https://www.customs.go.jp/english/c-answer_e/imtsukan/1006_e.htm), [2026 Ministry of Finance explanation](https://www.mof.go.jp/public_relations/finance/202603/202603d.html). |

These are review sources, not a tariff dataset. Verify applicability for the shipment date. See [tax research](../../Reference/TAX_AND_CUSTOMS.md).

## Business measurement and verification

The fee covers purchasing, option checks, receiving, basic inspection and normal packing. Extras require a disclosed quote. Measure payment/FX costs, handling time, materials, exceptions/refunds and remaining contribution for the first 30 orders. Contribution still pays overhead; 15% is not 15% profit. Do not rely on VAT refunds, hidden FX margins or understated customs values.

Tests cover fee thresholds, exact decimals, allocation, quantity/variant/destination matching, stale/conflicting evidence, unknown charges, assessed import amounts and historical fees. Browser tests cover the guest calculator. Synthetic test prices/taxes are never published as customer rates. Real merchant/carrier/broker/payment/warehouse operation remains separate verification.
