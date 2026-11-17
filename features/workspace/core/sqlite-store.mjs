import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { loadWorkspaceFixtures } from './fixtures.mjs';
import { sampleEncryption } from './sample-crypto.mjs';

export class WorkspaceError extends Error {
  constructor(status, message) { super(message); this.name = 'WorkspaceError'; this.status = status; }
}
const steps = ['REVIEW_REQUIRED', 'QUOTED', 'PAYMENT_PENDING', 'PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'];
const source = 'developer_workspace_sample';
const hash = value => createHash('sha256').update(value).digest('hex');
function fixtureId(value) { const text = hash(value); return `${text.slice(0, 8)}-${text.slice(8, 12)}-4${text.slice(13, 16)}-8${text.slice(17, 20)}-${text.slice(20, 32)}`; }
const label = status => `SAMPLE ${status.toLowerCase().replaceAll('_', ' ')}`;

export function openDeveloperWorkspace(options = {}) {
  const configured = options.directory ?? process.env.PAYNSHIP_WORKSPACE_DATA_DIR;
  if (configured && !isAbsolute(configured)) throw new WorkspaceError(503, 'The developer sample data directory must be absolute.');
  const directory = configured ?? resolve(process.cwd(), 'data/samples');
  const databasePath = join(directory, 'developer-workspace.sqlite');
  const keyPath = join(directory, 'developer-workspace.key');
  const fixtures = loadWorkspaceFixtures(options.fixturePath ?? resolve(process.cwd(), 'features/workspace/fixtures/developer-workspace-fixtures.json'));
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const existed = existsSync(databasePath);
  const db = new DatabaseSync(databasePath);
  let crypto;
  try {
    let marker;
    if (existed) {
      const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='workspace_metadata'").get();
      marker = table && db.prepare('SELECT * FROM workspace_metadata WHERE id=1').get();
      if (!marker || marker.namespace !== 'paynship-developer-workspace' || marker.schema_version !== 1 || marker.sample_only !== 1) {
        throw new WorkspaceError(503, 'Refusing an unmarked or incompatible developer sample database.');
      }
    }
    crypto = sampleEncryption(keyPath, existed);
    if (marker?.initialized === 1) {
      const canary = db.prepare('SELECT user_id,encrypted_data FROM delivery_profiles ORDER BY user_id LIMIT 1').get();
      try {
        if (!canary) throw new Error('Missing encrypted sample profile.');
        crypto.decrypt(canary.encrypted_data, `profile:${canary.user_id}`);
      } catch { throw new WorkspaceError(503, 'The existing sample data cannot be opened with this local encryption key.'); }
    }
    chmodSync(databasePath, 0o600);
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;');
    if (!existed) {
      db.exec('BEGIN IMMEDIATE');
      try { db.exec(readFileSync(options.schemaPath ?? resolve(process.cwd(), 'features/workspace/core/schema.sql'), 'utf8')); db.exec('COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    }
  } catch (error) { db.close(); throw error; }

  function transaction(run) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = run(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function customer(id) {
    const row = db.prepare('SELECT * FROM users WHERE id=? AND sample_only=1').get(id);
    if (!row) throw new WorkspaceError(404, 'Sample customer not found.');
    return { id: row.id, email: row.email, name: row.name, country: row.country, sampleOnly: true };
  }
  function product(id) {
    const row = fixtures.products.find(item => item.id === id);
    if (!row) throw new WorkspaceError(404, 'Sample product not found.');
    return row;
  }
  function quote(item, quantity) {
    const scenario = fixtures.scenario;
    const productCents = Math.round(item.estimatedPriceKrw * quantity * 100 / scenario.exchangeRateKrwPerUsd);
    const total = productCents + scenario.domesticShippingCents + scenario.serviceFeeCents + scenario.internationalShippingCents + scenario.insuranceCents;
    return { currency: 'USD', productName: item.name, productCents, domesticShippingCents: scenario.domesticShippingCents,
      serviceFeeCents: scenario.serviceFeeCents, internationalShippingCents: scenario.internationalShippingCents, insuranceCents: scenario.insuranceCents,
      dutyCents: null, taxCents: null, totalCents: total, subtotalCents: total, exchangeRateKrwPerUsd: scenario.exchangeRateKrwPerUsd,
      quoteVersion: 1, sampleOnly: true, customsStatus: 'UNKNOWN' };
  }
  function event(requestId, actorId, status, message, createdAt) {
    if (db.prepare('SELECT COUNT(*) AS count FROM purchase_events WHERE request_id=?').get(requestId).count >= 30) throw new WorkspaceError(429, 'Sample event limit reached.');
    db.prepare('INSERT INTO purchase_events VALUES(?,?,?,?,?,?,?,1)').run(randomUUID(), requestId, actorId, source, status,
      crypto.encrypt(message, `event:${requestId}`), createdAt);
  }
  function insertRequest(id, user, item, quantity, status, idempotencyKey, createdAt, profile) {
    const estimate = steps.indexOf(status) >= steps.indexOf('QUOTED') ? quote(item, quantity) : null;
    const paid = steps.indexOf(status) >= steps.indexOf('PAID');
    const shipped = ['SHIPPED', 'DELIVERED'].includes(status);
    const tracking = shipped ? `SAMPLE-NOT-TRACKABLE-${user.country}-${id.slice(0, 8)}` : null;
    db.prepare(`INSERT INTO purchase_requests(id,user_id,source_url,category,quantity,options,destination,encrypted_delivery,idempotency_key,payload_hash,
      status,version,quote,quote_expires_at,paid_at,carrier,tracking_number,last_carrier_event_at,created_at,updated_at,product_id,sample_only)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,0,?,NULL,?,?,?,?,?,?,?,1)`)
      .run(id, user.id, item.sourceUrl, item.category, quantity, crypto.encrypt(item.options, `options:${id}`), user.country,
        crypto.encrypt(profile, `request:${id}`), idempotencyKey, hash(JSON.stringify({ productId: item.id, quantity })), status,
        estimate ? JSON.stringify(estimate) : null, paid ? createdAt : null, shipped ? 'SAMPLE_ONLY' : null, tracking, shipped ? createdAt : null,
        createdAt, createdAt, item.id);
    return { estimate, paid };
  }
  function credit(userId, requestId, amount, kind, message, now) {
    if (db.prepare('SELECT COUNT(*) AS count FROM credit_entries WHERE user_id=?').get(userId).count >= 500) throw new WorkspaceError(429, 'Sample credit ledger limit reached.');
    db.prepare('INSERT INTO credit_entries VALUES(?,?,?,?,?,?,?,1)').run(randomUUID(), userId, requestId, amount, kind, message, now);
  }
  function support(requestId, subject, message, now, reply = null) {
    const id = randomUUID();
    db.prepare(`INSERT INTO purchase_support_tickets(id,request_id,subject,message,reply,status,version,created_at,updated_at,sample_only)
      VALUES(?,?,?,?,?,?,0,?,?,1)`).run(id, requestId, crypto.encrypt(subject, `support:${id}`), crypto.encrypt(message, `support:${id}`),
        reply ? crypto.encrypt(reply, `support:${id}`) : null, reply ? 'RESOLVED' : 'OPEN', now, now);
  }
  try {
    transaction(() => {
      if (db.prepare('SELECT initialized FROM workspace_metadata WHERE id=1').get().initialized === 1) return;
      const now = fixtures.initializedAt;
      for (const user of fixtures.customers) {
        db.prepare('INSERT INTO users(id,email,name,country,created_at,sample_only) VALUES(?,?,?,?,?,1)').run(user.id, user.email, user.name, user.country, now);
        db.prepare('INSERT INTO delivery_profiles VALUES(?,?,?,1)').run(user.id, crypto.encrypt(user.profile, `profile:${user.id}`), now);
        db.prepare('INSERT INTO ghost_sessions VALUES(?,?,?,?,0,1)').run(fixtureId(user.id + ':session'), user.id, hash('NON_AUTHENTICATING_SAMPLE_SESSION:' + user.id), now);
        db.prepare('INSERT INTO account_credits VALUES(?,?,?,1)').run(user.id, 'USD', fixtures.scenario.openingCreditCents);
        credit(user.id, null, fixtures.scenario.openingCreditCents, 'OPENING', 'Fictional opening balance; no funds were received.', now);
        for (const scenario of fixtures.requestScenarios) {
          const id = fixtureId(user.id + ':' + scenario.key);
          const item = product(scenario.productId);
          const { estimate, paid } = insertRequest(id, user, item, scenario.quantity, scenario.status, 'fixture:' + scenario.key, now, user.profile);
          const history = scenario.status === 'ON_HOLD' ? ['REVIEW_REQUIRED', 'ON_HOLD'] : steps.slice(0, steps.indexOf(scenario.status) + 1);
          const lastAt = new Date(Date.parse(now) + (history.length - 1) * 60000).toISOString();
          const paidAt = paid ? new Date(Date.parse(now) + steps.indexOf('PAID') * 60000).toISOString() : null;
          db.prepare('UPDATE purchase_requests SET updated_at=?,paid_at=?,last_carrier_event_at=? WHERE id=?')
            .run(lastAt, paidAt, ['SHIPPED', 'DELIVERED'].includes(scenario.status) ? lastAt : null, id);
          history.forEach((status, index) => event(id, 'sample-seed', status,
            `Fictional ${status.toLowerCase().replaceAll('_', ' ')} scenario. No merchant, payment provider or carrier action occurred.`,
            new Date(Date.parse(now) + index * 60000).toISOString()));
          if (estimate && (paid || scenario.status === 'PAYMENT_PENDING')) {
            db.prepare('INSERT INTO payment_fixtures VALUES(?,?,?,?,?,?,?, ?,1)').run(fixtureId(id + ':payment'), id, user.id, estimate.totalCents,
              paid ? 'COMPLETED' : 'PENDING', 'SAMPLE_CREDIT', now, paidAt);
          }
          if (paid) {
            db.prepare('UPDATE account_credits SET balance_cents=balance_cents-? WHERE user_id=?').run(estimate.totalCents, user.id);
            credit(user.id, id, -estimate.totalCents, 'PAYMENT', 'Seeded sample subtotal debit; duty/tax unknown.', paidAt);
          }
          if (scenario.key === 'hold') support(id, 'SAMPLE customs review question', 'This fictional request needs more product and route evidence. No customs eligibility is established.', now,
            'Sample operator reply: the scenario remains on hold. Do not treat estimates as customs approval.');
        }
      }
      db.prepare('UPDATE workspace_metadata SET initialized=1 WHERE id=1').run();
    });
  } catch (error) { db.close(); throw error; }

  function readWorkspace(customerId = 'sample-customer-jp') {
    const selected = customer(customerId);
    const rows = db.prepare('SELECT * FROM purchase_requests WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 50').all(customerId);
    const requests = rows.map(row => {
      const item = product(row.product_id);
      const events = db.prepare('SELECT * FROM purchase_events WHERE request_id=? ORDER BY created_at,rowid LIMIT 30').all(row.id)
        .map(item => ({ status: item.status, source: item.source, message: crypto.decrypt(item.message, `event:${row.id}`), createdAt: item.created_at }));
      const tickets = db.prepare('SELECT * FROM purchase_support_tickets WHERE request_id=? ORDER BY created_at DESC,rowid DESC LIMIT 10').all(row.id)
        .map(ticket => ({ id: ticket.id, subject: crypto.decrypt(ticket.subject, `support:${ticket.id}`), message: crypto.decrypt(ticket.message, `support:${ticket.id}`),
          reply: ticket.reply ? crypto.decrypt(ticket.reply, `support:${ticket.id}`) : null, status: ticket.status, version: ticket.version, createdAt: ticket.created_at }));
      return { id: row.id, sourceUrl: row.source_url, category: row.category, quantity: row.quantity, options: crypto.decrypt(row.options, `options:${row.id}`),
        destination: row.destination, status: row.status, statusLabel: label(row.status), version: row.version,
        quote: row.quote ? JSON.parse(row.quote) : null, quoteExpiresAt: null, paymentReceived: Boolean(row.paid_at), checkoutAvailable: false,
        carrier: row.carrier, trackingNumber: row.tracking_number, createdAt: row.created_at, updatedAt: row.updated_at, events, tickets,
        fulfilmentStarted: events.some(item => steps.indexOf(item.status) >= steps.indexOf('PURCHASING')),
        sampleOnly: true, productId: item.id, productName: item.name, estimatedPriceKrw: item.estimatedPriceKrw, observedPriceKrw: null, hsCode: null };
    });
    const account = db.prepare('SELECT balance_cents FROM account_credits WHERE user_id=?').get(customerId);
    const profile = db.prepare('SELECT encrypted_data FROM delivery_profiles WHERE user_id=?').get(customerId);
    return { sampleOnly: true, fixtureVersion: fixtures.schemaVersion, notice: fixtures.notice,
      customers: db.prepare('SELECT id FROM users ORDER BY country').all().map(row => customer(row.id)), customer: selected, products: fixtures.products,
      account: { currency: 'USD', balanceCents: account.balance_cents, sampleOnly: true },
      creditEntries: db.prepare('SELECT * FROM credit_entries WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 500').all(customerId)
        .map(row => ({ id: row.id, requestId: row.request_id, amountCents: row.amount_cents, kind: row.kind, label: row.label, createdAt: row.created_at })),
      payments: db.prepare('SELECT * FROM payment_fixtures WHERE user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 50').all(customerId)
        .map(row => ({ id: row.id, requestId: row.request_id, amountCents: row.amount_cents, status: row.status, provider: 'SAMPLE_CREDIT', createdAt: row.created_at, completedAt: row.completed_at, sampleOnly: true })),
      deliveryProfile: crypto.decrypt(profile.encrypted_data, `profile:${customerId}`), requests,
      deliveries: requests.filter(row => row.fulfilmentStarted).map(row => ({ requestId: row.id, carrier: row.carrier, trackingNumber: row.trackingNumber,
        status: row.status, lastEventAt: row.events.at(-1)?.createdAt ?? null, sampleOnly: true })) };
  }

  function getWorkspace(customerId = 'sample-customer-jp') {
    db.exec('BEGIN');
    try { const data = readWorkspace(customerId); db.exec('COMMIT'); return data; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }

  function ownedRequest(id, userId, version) {
    const row = db.prepare('SELECT * FROM purchase_requests WHERE id=? AND user_id=? AND sample_only=1').get(id, userId);
    if (!row) throw new WorkspaceError(404, 'Sample request not found for this customer.');
    if (version !== undefined && row.version !== version) throw new WorkspaceError(409, 'The sample request changed. Refresh before continuing.');
    return row;
  }
  function updateRequest(row, status, now, changes = {}) {
    const changed = db.prepare(`UPDATE purchase_requests SET status=?,version=version+1,updated_at=?,paid_at=?,carrier=?,tracking_number=?,last_carrier_event_at=?
      WHERE id=? AND user_id=? AND version=?`).run(status, now, changes.paidAt ?? row.paid_at, changes.carrier ?? row.carrier,
        changes.trackingNumber ?? row.tracking_number, changes.lastCarrierEventAt ?? row.last_carrier_event_at, row.id, row.user_id, row.version);
    if (changed.changes !== 1) throw new WorkspaceError(409, 'Another sample action changed this request.');
  }
  function quota(userId, now) {
    const row = db.prepare('SELECT quota_day,quota_count FROM users WHERE id=?').get(userId);
    const day = now.slice(0, 10);
    const count = row.quota_day === day ? row.quota_count : 0;
    if (count >= 120 || db.prepare('SELECT COUNT(*) AS count FROM action_receipts WHERE user_id=?').get(userId).count >= 2000) {
      throw new WorkspaceError(429, 'The local sample action quota is exhausted.');
    }
    db.prepare('UPDATE users SET quota_day=?,quota_count=? WHERE id=?').run(day, count + 1, userId);
  }
  function applyAction(action) {
    const now = new Date().toISOString();
    return transaction(() => {
      const user = customer(action.customerId);
      const payloadHash = hash(JSON.stringify(action));
      const prior = db.prepare('SELECT payload_hash FROM action_receipts WHERE user_id=? AND idempotency_key=?').get(user.id, action.idempotencyKey);
      if (prior) {
        if (prior.payload_hash !== payloadHash) throw new WorkspaceError(409, 'This sample action key already belongs to different input.');
        return readWorkspace(user.id);
      }
      quota(user.id, now);
      if (action.action === 'top_up') {
        if (!Number.isInteger(action.amountCents) || action.amountCents < 100 || action.amountCents > 100000) throw new WorkspaceError(422, 'Invalid fictional credit amount.');
        const changed = db.prepare('UPDATE account_credits SET balance_cents=balance_cents+? WHERE user_id=? AND balance_cents+?<=1000000').run(action.amountCents, user.id, action.amountCents);
        if (changed.changes !== 1) throw new WorkspaceError(422, 'The fictional balance would exceed the sample limit.');
        credit(user.id, null, action.amountCents, 'TOP_UP', 'Fictional credit top-up. No real funds received.', now);
      } else if (action.action === 'pay') {
        const row = ownedRequest(action.requestId, user.id, action.version);
        if (!['QUOTED', 'PAYMENT_PENDING'].includes(row.status) || row.paid_at || !row.quote) throw new WorkspaceError(409, 'This sample request cannot be paid at its current stage.');
        const estimate = JSON.parse(row.quote);
        const changed = db.prepare('UPDATE account_credits SET balance_cents=balance_cents-? WHERE user_id=? AND balance_cents>=?').run(estimate.totalCents, user.id, estimate.totalCents);
        if (changed.changes !== 1) throw new WorkspaceError(422, 'Add fictional account credit before simulating this payment.');
        db.prepare(`INSERT INTO payment_fixtures VALUES(?,?,?,?,?,'SAMPLE_CREDIT',?,?,1)
          ON CONFLICT(request_id) DO UPDATE SET status='COMPLETED',completed_at=excluded.completed_at`).run(randomUUID(), row.id, user.id, estimate.totalCents, 'COMPLETED', now, now);
        updateRequest(row, 'PAID', now, { paidAt: now });
        credit(user.id, row.id, -estimate.totalCents, 'PAYMENT', 'Simulated payment of sample subtotal; duty/tax excluded and unknown.', now);
        event(row.id, user.id, 'PAID', 'Local sample credit debited. No payment provider or merchant was contacted.', now);
      } else if (action.action === 'advance_delivery') {
        const row = ownedRequest(action.requestId, user.id, action.version);
        if (!row.paid_at || !['PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED'].includes(row.status)) throw new WorkspaceError(409, 'This sample shipment cannot advance at its current stage.');
        const next = steps[steps.indexOf(row.status) + 1];
        const shipped = next === 'SHIPPED' || next === 'DELIVERED';
        updateRequest(row, next, now, shipped ? { carrier: 'SAMPLE_ONLY', trackingNumber: row.tracking_number ?? `SAMPLE-NOT-TRACKABLE-${user.country}-${row.id.slice(0, 8)}`, lastCarrierEventAt: now } : {});
        event(row.id, user.id, next, `Fictional ${next.toLowerCase().replaceAll('_', ' ')} update. No carrier, customs or seller action occurred.`, now);
      } else if (action.action === 'create_sample_request') {
        const item = product(action.productId);
        if (db.prepare('SELECT COUNT(*) AS count FROM purchase_requests WHERE user_id=?').get(user.id).count >= 50) throw new WorkspaceError(429, 'The customer sample request limit is 50.');
        const profile = crypto.decrypt(db.prepare('SELECT encrypted_data FROM delivery_profiles WHERE user_id=?').get(user.id).encrypted_data, `profile:${user.id}`);
        const id = randomUUID();
        insertRequest(id, user, item, 1, 'QUOTED', action.idempotencyKey, now, profile);
        event(id, user.id, 'QUOTED', 'Illustrative quote created from estimated fixture values. Customs, actual price, duty and tax remain unknown.', now);
      } else if (action.action === 'support') {
        const row = ownedRequest(action.requestId, user.id);
        const tickets = db.prepare('SELECT COUNT(*) AS count FROM purchase_support_tickets WHERE request_id=?').get(row.id).count;
        if (tickets >= 3) throw new WorkspaceError(429, 'The sample supports three tickets per request.');
        if (typeof action.subject !== 'string' || action.subject.length < 3 || action.subject.length > 120 || typeof action.message !== 'string' || action.message.length < 10 || action.message.length > 2000) throw new WorkspaceError(422, 'Invalid sample support message.');
        support(row.id, action.subject, action.message, now);
      } else if (action.action === 'save_delivery') {
        const delivery = action.delivery;
        if (delivery.country !== user.country || !delivery.fullName.startsWith('SAMPLE ') || !delivery.address1.startsWith('SAMPLE ') || delivery.customsId) {
          throw new WorkspaceError(422, 'Use fictional SAMPLE recipient/address values, no customs identifiers, and this ghost customer country.');
        }
        db.prepare('UPDATE delivery_profiles SET encrypted_data=?,updated_at=? WHERE user_id=?').run(crypto.encrypt(delivery, `profile:${user.id}`), now, user.id);
      } else if (action.action === 'cancel_request') {
        const row = ownedRequest(action.requestId, user.id, action.version);
        if (!['REVIEW_REQUIRED', 'QUOTED'].includes(row.status)) throw new WorkspaceError(409, 'Only unpaid sample requests before payment creation can be cancelled.');
        updateRequest(row, 'CANCELLED', now);
        event(row.id, user.id, 'CANCELLED', 'Cancelled in the persistent local sample only.', now);
      } else throw new WorkspaceError(422, 'Unknown local sample action.');
      db.prepare('INSERT INTO action_receipts VALUES(?,?,?,?,1)').run(user.id, action.idempotencyKey, payloadHash, now);
      // Decrypt the response before committing, so corrupted sample data cannot
      // produce a failed response after a balance mutation has already persisted.
      return readWorkspace(user.id);
    });
  }
  return { getWorkspace, applyAction, databasePath, close: () => db.close() };
}
