# Documentation governance

Updated: 2026-10-11.

- `README.md` explains local execution and current scope; `AGENTS.md` contains concise agent rules.
- `documents/` contains current product, feature, security, tax and operations references.
- `docs/plans/YYYY-MM-DD-*.md` contains the active implementation plan.
- `documents/Archive/` and older Journal/research/legal drafts are historical; they never prove current behavior or launch readiness.
- Duplicate snapshot trees and superseded AI/master plans have been removed. Git preserves their history.
- Use relative links and one subject per document. Do not copy one specification across version folders.
- Update the corresponding registered document with API, schema, privacy, payment or operations changes.
- Explicitly separate implemented behavior, unconfigured integrations and planned functionality.
- Legal, financial and carrier claims require a dated official source. No guaranteed VAT margin, worldwide customs support or live tracking claims without evidence.
- `npm run docs:check` checks synchronization; it does not verify legal claims or replace runtime tests.

[Registry](REGISTRY.yaml) routes changes to their current specifications.
