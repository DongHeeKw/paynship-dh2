# AGENTS.md

PayNShip currently implements URL-based purchasing workflow foundations. The target is the commerce compiler defined below; do not confuse intended and shipped capabilities.

## Mandatory product direction and agent autonomy (2026-11-22)

**<u>PayNShip is a cross-border commerce compiler + MD engine; it is not merely a URL-based forwarding website.</u>** Both pasted URLs and MD product cards feed one exact-SKU product/compliance/procurement/shipping compiler. **The founder's home is the initial Korean receiving/inspection/consolidation/dispatch hub (`HOME_HUB`); an external 3PL is NOT an MVP prerequisite.**

**<u>Automated selection and multi-order consolidation ARE the core business algorithm:</u>** exact seller offers → home intake/inspection → separate/all/partial/wait shipping plan generation → verified country customs/importer/DDP eligibility → carrier service rates (including billed volume weight and surcharges) → lowest eligible total landed cost → customer savings/extra waiting days and consent → physical dispatch/signed tracking. Never assume "system decides" without implementing a typed decision function, traceable inputs, constraints, calculated outcomes and tests.

**The owner does not currently have code-review expertise in Next.js, Three.js or DB/Prisma.** Do not block technical design decisions on their approval; the agent owns maintainable implementation, TDD, regression tests, code explanation and beginner-friendly runnable learning notes. Actual financial purchase/refund, legal import declarations, provider contracts, customer PII/home address publicity and production deployment require appropriate real authorization and proof. Never fake approval of outside services or customs rules.

**Read these before implementation:**
1. [Product vision: compiler + MD](documents/2027/PRODUCT_VISION_COMPILER_AND_MD.md)
2. [HOME_HUB & multi-order shipping](documents/2027/HOME_HUB_AND_CONSOLIDATION_SRS.md)
3. [Full business algorithms](documents/2027/AUTO_ENGINE_ALGORITHMS_AND_WORK_PROCESS.md)
4. [US/JP/CN customs SW + Golden Test](documents/2027/KOREAN_CUSTOMS_SW_TEST_REQUIREMENTS.md)
5. [Agent autonomous TDD contract](documents/2027/TDD_AGENT_DEVELOPMENT_CONTRACT.md)
6. [First working pure function / learning unit](documents/2027/LEARNING_STEP_01_CONSOLIDATION.md)

**Required workflow:** first specify a customer-facing expected result, write failing deterministic test (RED), implement minimal pure service (GREEN), refactor (REFACTOR), run CI/type-check/build/security tests, record actual results (or NOT RUN) with before/after and lesson. Follow https://toss.tech/article/frontend-declarative-code and https://frontend-fundamentals.com/code-quality/code/: declarative responsibilities, readability, predictability, cohesion, loose coupling. Preserve existing user ownership, PII encryption, signed carrier/payment evidence, rule expiry and historical paid quotes.

**Current vertical slice:** `lib/compiler/consolidation/recommend.ts` + `lib/compiler/consolidation/__tests__/recommend.test.ts` **only selects among already-verified candidate plans**. It is **not** end-to-end auto booking/customs/packing; the verified flags and manifest/recipient fingerprints must eventually be server-derived. Do not wire it to paid checkout until real approved rate/customs evidence is available.


## Read order

1. `AGENTS.md`
2. [Context playbook](documents/_meta/AGENT_CONTEXT_PLAYBOOK.md)
3. [Documentation registry](documents/_meta/REGISTRY.yaml)
4. [README](README.md)
5. Only the feature or operations document needed for the change

## Current references

- [Product](documents/PRODUCT_SPECIFICATION.md)
- [Implementation status](documents/Features/STATUS.md)
- [Product evidence and customs](documents/Features/Product-Data-Pipeline/Spec.md)
- [Requests, payments and status](documents/Features/Order-Checkout/Spec.md)
- [Security](documents/Reference/SECURITY.md)
- [Operations](documents/Reference/OPERATIONS.md)
- [Local setup and deployment](documents/Reference/Deployment/DEPLOYMENT.md)
- [Tax and customs research](documents/Reference/TAX_AND_CUSTOMS.md)

## Commands

- Install: `npm install`
- Isolated sample app: `npm start app` (Node 24+, Linux; port 3002)
- Develop source: `npm run dev`
- Check types: `npm run type-check`
- Tests: `npm run test:ci`
- Build: `npm run build`
- Docs check: `npm run docs:check`
- Environment check: `npm run ops:check`

## Rules

- Keep each module responsible for one feature; split validation, persistence, policy, payment and presentation.
- Never add conversational AI or model calls to this flow.
- A valid product URL never proves customs eligibility. Unknown evidence or country rules require review.
- Do not guess HS codes, tax rates, payment success, carrier events or delivery dates.
- Require verified authentication, ownership checks and server verified operator roles for private data and mutations.
- Preserve historical DB data unless deletion is explicitly authorized. Encrypt new delivery and customs data; never store card credentials.
- Bound request sizes, quotas and retries; use durable idempotency and transactional concurrency controls.
- Update the corresponding stable docs with behavior, API, schema or operations changes.
- Stable docs live in `documents/`; current dated plans in `docs/plans/`; `documents/Archive/` is historical.
- Use portable relative documentation links. Register new sources and triggers in [REGISTRY.yaml](documents/_meta/REGISTRY.yaml).

New self-contained capabilities have canonical documentation beside their owner: `features/storefront/`, `features/workspace/`, `features/reseller/`, and `components/home/`. Preserve dh2 pricing/variant extraction/social-provider behavior when integrating another checkout. Add behavioral regressions before changes; do not claim full MC/DC without measured condition/decision evidence.
