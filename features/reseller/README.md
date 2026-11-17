# Reseller requests

`GET /api/reseller/requests` lists the verified token owner's requests, with owned UUID pagination. `POST` accepts the same single-product request schema, 8 KiB body limit, quotas, idempotency and transaction controls as the customer flow. A request never purchases goods or approves customs.

`core/auth.ts` verifies a short-lived Bearer access token with Supabase `getUser`, including confirmed email. Browser cookies alone cannot authenticate this API. User ID and destination cannot be supplied by the caller; ownership comes from the verified user and destination from the stored delivery profile. Middleware retains rate/body/origin protections and private no-store responses. The public usage guide is `/developers`.

The fee is 15% of merchandise with no minimum, calculated by shared purchase logic. Delivery routes, verified import charges and payment approval remain the same as the customer website. Live operation requires configured auth, database and request protection. Authentication regressions are beside the module; browser tests confirm guest denial and retired-route rejection.
