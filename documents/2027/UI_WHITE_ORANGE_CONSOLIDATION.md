# PayNShip white + orange UI: customer consolidation and Home Hub

**Status: code implemented as gated local preview, not a customer production page (2026-11-22).**

The established PayNShip identity is **white canvas with orange highlights**. The earlier navy/teal imagery was conceptual only, and is superseded by these actual Next.js preview components. No global palette replacement is needed; the preview uses a **scoped CSS Module**, avoiding unrequested changes to checkout and the live storefront.

## Where to look

- `app/dev/consolidation/page.tsx` — only serves a mock, local/dev-gated page through existing `devPreviewAllowed`; never available on the public release.
- `components/consolidation/ConsolidationPreview.tsx` — two screen modes, toggles and illustrative no-side-effect selection state.
- `components/consolidation/ConsolidationPreview.module.css` — responsive white/orange visual language, focus styles, reduced-motion support.
- `lib/compiler/consolidation/presentation.ts` — **business decision → friendly Korean benefit copy**. This pure function doesn't approve shipping or customize real tax data.
- `lib/compiler/consolidation/__tests__/presentation.test.ts` and `components/consolidation/__tests__/ConsolidationPreview.test.tsx` — copy, consent and no-false-approval regression.

## Start (development workstation)

```bash
npm ci
npm run dev
# open http://localhost:3000/dev/consolidation
npx vitest run lib/compiler/consolidation/__tests__/presentation.test.ts components/consolidation/__tests__/ConsolidationPreview.test.tsx
npm run type-check
npm run build
```

If the development-preview security gate rejects your environment, follow the existing `lib/dev-preview/access.ts` rules. Never disable production gating for a convenience demo.

## Exact wording contract

| Compiler state | Customer title | Customer action |
|---|---|---|
| Verified saving positive | **함께 배송하면 8,000원 아낄 수 있어요** (synthetic example) | Compare options and explicitly consent |
| Saving positive and delayed | **함께 배송하면 N원 아낄 수 있어요** + “3일 더 기다려야 해요” | Savings and wait time together |
| Separate cheaper or same | **따로 보내는 게 더 유리해요** | Keep separate delivery |
| Missing real rate/tax | **배송비를 확인하고 있어요** | No verified saving or payment CTA |

The customer experience avoids a jargon-first "합배송을 추천합니다"; the operator view can still use business terms (e.g. consolidation) in internal planning. No false urgency or automatic shipping decision.

## Screen structure and visual rules

- Bright white `#ffffff` canvas, white cards, warm neutral borders `#ece9e5`, orange `#f36d27` highlights and `#fff0e6` pale orange for emphasis.
- The orange is used for **savings, selected shipping option, clear actions and warning visibility**, not all elements at once.
- Desktop: large savings hero + left item timeline/right shipping comparison; operator: inbound counts, inventory exception, opportunity and pack/dispatch process.
- Mobile: one-column panels, vertical actions, scrollable wide inbound table, no sidebar overlay hiding tasks.
- Main navigation offers customer/operator visual mode switch in the **local preview only**.
- Actions are **illustrative UI selection**, not persisted consent, carrier booking, shipment or payment.
- An explicit synthetic-data disclaimer is shown in both views. Dates, duty-free claims and live carrier choices must not be invented.

## What still needs real implementation (do not mistake UI for commerce)

- Login owner scope: show only signed-in customer's own same-destination orders.
- HOME_HUB inventory/arrival/inspection/packing DB and actual admin authorization.
- Generate separate/all/partial/wait candidates; current pure compiler selects from already verified candidates only.
- Real source rate cards and per-parcel dimensional weight, country customs rule versions, exact products, importer-of-record and DDP eligibility.
- Quote state transitions, savings baseline proof, customer consent stored securely, signed tracking, customs and refund.
- Translation for US English / CN simplified Chinese / JP Japanese with correct customs costs.
- First-party screenshot and Playwright UI tests across mobile/desktop before replacing any real route.

**Agent:** next task is to connect verified server-derived candidate results to UI, not use the synthetic sample booleans in checkout. See [HOME_HUB SRS](HOME_HUB_AND_CONSOLIDATION_SRS.md) and [AGENTS](../../AGENTS.md).
