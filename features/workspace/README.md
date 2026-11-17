# Fictional customer workspace

Open `npm start app`, then `/dev/workspace` on the printed local URL. The sample has three fictional CN/JP/US personas, seven request states each, a credit ledger, payment history, delivery progression, address editing, support and a customs-evidence view. Persona selection is not a real login. Credit is not real money; payment/delivery actions never call a provider.

`core/` owns the marked SQLite database, transactions, encrypted sample fields, immutable fixtures and input contracts. `boundary/` restricts access to development mode, explicit `PAYNSHIP_DEV_PREVIEW=1` and exact loopback Host. Mutations additionally require a matching Origin and bounded JSON. Production returns 404 even if the flag is set. `ui/` presents these records; the two route adapters are under `app/dev/workspace/`.

`npm run samples:workspace` creates `data/samples/developer-workspace.sqlite` and its separate local encryption key. Both are ignored by Git. Existing records, balances and keys are preserved; an unknown database marker, incompatible fixture payload or wrong/missing key fails closed. Do not reset a database or change the fixture fingerprint to bypass these checks. The immutable historical scenario quotes retain their fictional fixed fees; they are not new binding quotes under today's [15% policy](../../documents/Features/Pricing/Spec.md). Real quotes use the production fee calculator.

The source snapshot receives an explicit sample-data directory pointing back to this checkout; it excludes real `.env` files and clears provider/database credentials. Its service is `paynship-dh2-sample-preview.service`, port 3002. It does not stop the old repository's service. Re-run `npm start app` after source changes. `npm start` without `app` remains the production Next.js command.

The older `/dev/preview` remains an in-memory form sandbox. Its sample destination is Japan, and Products opens the public catalog. Neither preview grants authentication or access to real customer APIs.

Naver URLs are real references; their estimated descriptions/prices are explicitly fictional. Recorded November 15 collection attempts were blocked by robots policy and yielded zero product fields. The customs view separates missing product evidence, broker/recipient evidence, unknown duties and missing actual release records. No policy date is extended by opening the sample.

Validation: `npm run samples:workspace:test`, feature boundary/UI tests and local browser smoke. Full MC/DC and live provider/production DB integration are not established by these tests.
