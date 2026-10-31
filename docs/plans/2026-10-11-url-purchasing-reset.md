# URL purchasing reset

The customer flow is URL → sign in → delivery profile → purchase request → operator review → hosted payment → warehouse → shipment tracking. No conversational AI, model calls, automatic HS classification, or customer dashboard.

Implementation boundaries:
- A recognized retailer URL is a candidate, never proof of customs eligibility.
- Restricted product categories are outside the initial service scope. Unknown destinations, evidence, and tariff rules require review.
- Duties are calculated from dated, operator-approved inputs with fixed arithmetic; rates are never guessed.
- Existing historical order data stays intact. New request/profile/support tables are additive migrations, not a production database reset.
- Address/customs data is encrypted; payment cards remain with the payment provider.
- Server authentication, ownership, operator roles, bounded bodies, distributed request limits, transactional quotas, idempotency and optimistic concurrency are required.
- No fake delivery dates, paid states, carrier events or refund confirmations.
- Remove Docker local runtime, duplicate snapshot docs and retired conversation/scanning code. Keep warehouse operations because receipt, inspection, packing and actual weight are part of fulfilment.

External dependencies still requiring configuration: Supabase/Auth, database migration, encryption key, Redis for public production traffic, Shopify hosted payment/webhooks, carrier contract/webhook credentials, and destination-specific verified policy data.
