# AGENTS.md

PayNShip is a URL based purchasing and international shipping service for overseas customers.

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
- Run: `npm run dev`
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
