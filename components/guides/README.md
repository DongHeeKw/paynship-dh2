# Combined customer guide

`HowItWorksGuide.tsx` owns the third primary tab at `/guides/how-it-works`: the original illustrated buying journey, costs, shipping, returns, support guidance and FAQ. Its topic links let customers jump to each section. `service-guide.css` preserves the restored storefront style and supplies FAQ styling even when visitors open the guide directly.

The owner requested one guide on 2026-11-24. `/guides/shipping-and-returns` redirects (307) to `/guides/how-it-works#shipping-and-returns` to preserve older links. The header and footer use the canonical route. Paste a Link (`/`) and Discover Korea (`/products`) retain separate entry responsibilities; this guide contains no URL form.

The guide describes current capabilities, not approved future policy: a 15% merchandise service fee with no minimum; shipping and import costs separately reviewed; no confirmed combined-shipping booking or automatic post-payment refund. Never invent delivery dates, refunds or legal eligibility. Canonical fee policy remains [Pricing](../../documents/Features/Pricing/Spec.md).

Verification: `components/site/__tests__/tab-roles.test.tsx` checks the tab boundaries and guide sections; `e2e/commerce-home.spec.ts` checks navigation, legacy redirect, disclosures and responsive layout. [Before/after and actual results](../../documents/2027/LEARNING_STEP_03_MAIN_COMMERCE_HOME.md).
