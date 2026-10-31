# Sample database

`purchase-samples.sqlite` is a local, disposable SQLite artifact generated from `product-evidence-2026-10-12.json` by `scripts/product-samples/create-db.mjs`. It is ignored in Git. The creator uses Node24's built-in SQLite module, binds values and never reads `.env`, connects to Supabase, migrates PostgreSQL or writes to the application database.

| SQLite table | Content | Relationship to the live application |
| --- | --- | --- |
| `product_evidence` | Five real collection attempts with per-field sources, timestamps, raw-response hashes and unknown fields | Reference evidence for an operator reviewing a product; no automatic import or approval |
| `sample_customers` | Three clearly fictional identities with reserved `example.invalid` email addresses | Demonstrates customers and destination countries; does not replace Supabase Auth or encrypted delivery profiles |
| `sample_orders` | Three fictional requests linked to evidence and customers | Demonstrates request relationships; cannot create payments or authorize purchases |
| `sample_shipments` | One `SAMPLE_ONLY` carrier fixture | Demonstrates a status display; not a signed carrier event or usable tracking number |
| `sample_support` | One fictional support ticket | Demonstrates an order-related support record; no real messages are sent |

The live application uses Prisma/PostgreSQL, authenticated ownership, encrypted delivery information, transactional quotas, reviewed quotes and verified provider events. This SQLite schema deliberately remains independent. Sample order IDs and status labels cannot be copied into the live API as authenticated or approved records.

Recreate the SQLite artifact without making network requests:

```powershell
npm run product:samples:db -- product-evidence-2026-10-12.json
```

Inspect it with any SQLite client in read-only mode:

```sql
SELECT id, source_url, fetch_status, customs_status FROM product_evidence;

SELECT source_url,
       json_extract(evidence_json, '$.fields.name.value') AS name,
       json_extract(evidence_json, '$.fields.price.value') AS observed_price,
       json_extract(evidence_json, '$.fields.price.source') AS price_source,
       json_extract(evidence_json, '$.missingFields') AS unknown_fields
FROM product_evidence;

SELECT o.id, c.destination_country, o.status, p.source_url, o.real_payment, o.synthetic
FROM sample_orders o
JOIN sample_customers c ON c.id = o.customer_id
JOIN product_evidence p ON p.id = o.product_evidence_id;
```

For Node24, a read-only count check needs no SQLite installation:

```powershell
node --input-type=module -e "import {DatabaseSync} from 'node:sqlite'; const db=new DatabaseSync('data/samples/purchase-samples.sqlite',{readOnly:true}); console.table(db.prepare('SELECT fetch_status,COUNT(*) AS count FROM product_evidence GROUP BY fetch_status').all()); db.close();"
```

An observed price, SKU or stock flag is a merchant snapshot rather than verified customs evidence. The three successful Yes24 pages do not establish packaged weight, packaged dimensions, origin, material or HS classification. One successful page reports `SoldOut`. The other two attempts retain missing fields. Every evidence row remains `review_required`; fictitious customers, orders, shipments and support records are flagged as synthetic and contain no card credentials or real customs identifiers.
