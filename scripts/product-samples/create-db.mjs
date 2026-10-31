import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(root, 'data/samples');
const reportName = process.argv[2] ?? 'product-evidence-2026-10-12.json';
if (!/^product-evidence-\d{4}-\d{2}-\d{2}\.json$/.test(reportName)) throw new Error('Choose a sample evidence report filename.');
const report = JSON.parse(fs.readFileSync(path.join(directory, reportName), 'utf8'));
const databasePath = path.join(directory, 'purchase-samples.sqlite');
const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS product_evidence (
    id TEXT PRIMARY KEY, source_url TEXT NOT NULL UNIQUE, retrieved_at TEXT NOT NULL,
    fetch_status TEXT NOT NULL, evidence_json TEXT NOT NULL, customs_status TEXT NOT NULL CHECK(customs_status='review_required')
  );
  CREATE TABLE IF NOT EXISTS sample_customers (
    id TEXT PRIMARY KEY, label TEXT NOT NULL, email TEXT NOT NULL, destination_country TEXT NOT NULL,
    synthetic INTEGER NOT NULL CHECK(synthetic=1)
  );
  CREATE TABLE IF NOT EXISTS sample_orders (
    id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES sample_customers(id),
    product_evidence_id TEXT NOT NULL REFERENCES product_evidence(id), status TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 3), real_payment INTEGER NOT NULL CHECK(real_payment=0),
    synthetic INTEGER NOT NULL CHECK(synthetic=1), note TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sample_shipments (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES sample_orders(id), status TEXT NOT NULL,
    carrier TEXT NOT NULL CHECK(carrier='SAMPLE_ONLY'), tracking_number TEXT NOT NULL,
    synthetic INTEGER NOT NULL CHECK(synthetic=1)
  );
  CREATE TABLE IF NOT EXISTS sample_support (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES sample_orders(id), subject TEXT NOT NULL,
    status TEXT NOT NULL, synthetic INTEGER NOT NULL CHECK(synthetic=1)
  );
`);
try {
  database.exec('BEGIN');
  const insertEvidence = database.prepare(`INSERT INTO product_evidence VALUES(?,?,?,?,?,?)
    ON CONFLICT(source_url) DO UPDATE SET retrieved_at=excluded.retrieved_at,fetch_status=excluded.fetch_status,evidence_json=excluded.evidence_json`);
  const evidenceId = product => 'evidence-' + createHash('sha256').update(product.sourceUrl).digest('hex').slice(0, 16);
  for (const product of report.products) {
    insertEvidence.run(evidenceId(product), product.sourceUrl, product.retrievedAt, product.fetchStatus, JSON.stringify(product), 'review_required');
  }
  const exampleProductId = evidenceId(report.products.find(product => product.fetchStatus === 'fetched') ?? report.products[0]);
  for (const [index, country] of ['SG', 'JP', 'US'].entries()) {
    const id = String(index + 1).padStart(3, '0');
    database.prepare('INSERT INTO sample_customers VALUES(?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET destination_country=excluded.destination_country')
      .run('sample-customer-' + id, 'Fictional Customer' + id, 'sample' + id + '@example.invalid', country);
    database.prepare('INSERT INTO sample_orders VALUES(?,?,?,?,1,0,1,?) ON CONFLICT(id) DO UPDATE SET product_evidence_id=excluded.product_evidence_id,status=excluded.status')
      .run('sample-order-' + id, 'sample-customer-' + id, exampleProductId, index === 0 ? 'REVIEW_REQUIRED' : 'DEMO_STATUS_ONLY',
        'Fictional workflow fixture. No customs decision, real payment or carrier event.');
  }
  database.prepare('INSERT INTO sample_shipments VALUES(?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET status=excluded.status')
    .run('sample-shipment-001', 'sample-order-002', 'DEMO_IN_TRANSIT', 'SAMPLE_ONLY', 'SAMPLE-NOT-TRACKABLE-001');
  database.prepare('INSERT INTO sample_support VALUES(?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET status=excluded.status')
    .run('sample-support-001', 'sample-order-003', 'Fictional delivery question', 'OPEN');
  database.exec('COMMIT');
} catch (error) { database.exec('ROLLBACK'); throw error; }
const counts = {};
for (const table of ['product_evidence', 'sample_customers', 'sample_orders', 'sample_shipments', 'sample_support']) {
  counts[table] = database.prepare('SELECT COUNT(*) AS count FROM ' + table).get().count;
}
database.close();
console.log(JSON.stringify({ databasePath, counts, productionDatabaseAccessed: false }, null, 2));
