# Product browsing

Owner: `catalog/` contains the eight references, category policy and pagination; `products/` presents them. Route: `/products`. Shared purchasing and fee logic stays in `lib/purchases/`.

Eight seller references cover beauty, stationery, home, accessories and K-pop. Four products appear per page. A labelled native category select filters before pagination; category/page live in the URL and survive reload/history. Seller photos are local, attributed through each listing and `catalog/references.json`; no invented prices, stock or customs approval. `catalog/collection-evidence.json` retains dated collection provenance. Check dates belong to the individual evidence record and are not refreshed by a code deployment.

Selecting a product saves the exact listing, category, quantity and product-name options to the bounded same-tab intake draft. The public request form performs its own URL and category checks. All eight links have regression coverage against the server URL policy, including precise Cafe24 product identifiers and Korean KRW Weverse URLs. Cosmetic ingredients, fragile packaging and light-stick batteries still require review.

The shared cream/cobalt/coral/navy theme also applies to request, address and account pages. The [welcome scene](../../components/home/README.md) is separate from product browsing. Canonical fee policy: [pricing](../../documents/Features/Pricing/Spec.md).

Validation: catalog tests cover pagination/filter boundaries and link compatibility; `e2e/public-journey.spec.ts` covers loaded photographs, keyboard selection, browser history, draft handoff and responsive layouts.
