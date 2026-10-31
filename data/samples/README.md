# Product evidence and fictional workflow samples

This directory contains a separate SQLite sample database and dated evidence reports. It never connects to Supabase or the application's production database.

The live collection on 2026-10-12 KST attempted five official retailer URLs. Three Yes24 pages returned structured product observations; Musinsa disallowed the request through its robots policy; Kyobo returned a format that this HTML collector does not support. Blocked entries retain unknown fields rather than invented product information.

| Product URL | Collection result |
| --- | --- |
| [Yes24 13137546](https://www.yes24.com/product/goods/13137546) | JSON-LD name, SKU, price, KRW currency and availability |
| [Yes24 90164265](https://www.yes24.com/product/goods/90164265) | JSON-LD observations include `SoldOut`; purchasing is not approved |
| [Yes24 108422348](https://www.yes24.com/product/goods/108422348) | JSON-LD name, SKU, price, KRW currency and availability |
| [Musinsa 5132111](https://www.musinsa.com/products/5132111) | Robots policy blocked product collection |
| [Kyobo S000000610612](https://product.kyobobook.co.kr/detail/S000000610612) | HTTP200; unsupported content type; no product fields recorded |
| [Naver Brand kinox 5912828061](https://brand.naver.com/kinox/products/5912828061) | Robots HTTP200; policy blocked collection before the product-page request; no product fields recorded |

The additional Naver attempt is recorded separately in `naver-product-evidence-2026-10-12.json` at `2026-10-12T01:22:35.748Z`. The supplied `site_preference` and `NaPm` tracking parameters normalize to the canonical link above. The collector observed the robots-policy refusal only; it did not observe a product-page HTTP status, title, price, availability, deletion or customs classification. All required product fields remain unknown and customs status is `review_required`. The original five-product report and its SQLite workflow samples are preserved.

Every observed field carries its source selector, URL, retrieval timestamp and SHA-256 of the raw page. Observations are not customs verification. HS code, package dimensions, package weight and other missing facts remain unknown; all five entries require review. Prices are a dated snapshot and can change.

`purchase-samples.sqlite` contains five product-evidence rows, three fictional customers, three fictional orders, one fictional shipment and one fictional support ticket. Customer email addresses use the reserved `example.invalid` domain. Shipment `SAMPLE_ONLY` and `SAMPLE-NOT-TRACKABLE-001` are explicit examples, not carrier events. No card credentials, real personal details or usable customs identifiers are stored.

Reproduce the data with Node24 (the database creator uses the built-in experimental SQLite module):

```powershell
npm run product:evidence:test
npm run product:samples -- https://www.musinsa.com/products/5132111 https://www.yes24.com/product/goods/13137546 https://www.yes24.com/product/goods/90164265 https://product.kyobobook.co.kr/detail/S000000610612 https://www.yes24.com/product/goods/108422348
npm run product:samples:db -- product-evidence-2026-10-12.json
```

The current `product:samples` CLI writes `product-evidence-{KST date}.json`, replacing an existing report for that day. Running it for only the Naver link would therefore replace the five-product report if done on the same date. The additional Naver evidence was collected with the same bounded collector into a separate file; keep reports separate when checking new links. Public preview may display this exact-URL, dated collection result, but does not run the collector or fetch a customer's arbitrary URL.

The collector is an operator CLI, with at most 10 validated product URLs per invocation, duplicate removal, sequential requests, no retries, one same-host redirect, an 8-second DNS/request deadline and a 2MiB response limit. It checks robots policy and public DNS addresses, pins the HTTPS connection to the resolved IP and keeps TLS certificate verification enabled. It has no browser automation, challenge bypass, cookies or authentication credentials. It is not exposed through a public API.

The SQLite binary is ignored in Git and reproduced from the committed JSON. See [schema and inspection commands](SAMPLE_DB.md).

Robots policies exceeding 5,000 lines or 300 rules fail closed before product collection. IPv6 addresses are normalized before reserved-prefix checks so equivalent address spellings receive the same decision.

IPv6 filtering conservatively excludes special-purpose, transition and documentation ranges using the [IANA registry](https://www.iana.org/assignments/iana-ipv6-special-registry/); it does not rely on those ranges' narrowly defined public exceptions.

The referenced sibling `smartstore/category_full` implementation was read as context only. Its `main.py`, `scraper.py`, `data_processor.py` and `database.py` gather shopping category breadcrumbs and map Excel category codes into SQLite JSON. They do not supply product facts or HS decisions. The sibling code was not run, and its configuration, databases and artifacts were not changed.
