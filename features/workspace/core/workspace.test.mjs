import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDeveloperWorkspace } from './sqlite-store.mjs';

function workspace(run) {
  const directory = mkdtempSync(join(tmpdir(), 'paynship-developer-workspace-'));
  let store;
  try { store = openDeveloperWorkspace({ directory }); return run(store, directory); }
  finally { store?.close(); rmSync(directory, { recursive: true, force: true }); }
}
const customerId = 'sample-customer-jp';
const action = input => ({ customerId, idempotencyKey: randomUUID(), ...input });

test('isolated sample schema seeds once, retains changes, encrypts profile/options/events/support and marks estimates unknown', () => workspace((store, directory) => {
  const data = store.getWorkspace(customerId);
  assert.equal(data.sampleOnly, true);
  assert.equal(data.customers.length, 3);
  assert.equal(data.requests.length, 7);
  assert.equal(data.creditEntries.reduce((sum, row) => sum + row.amountCents, 0), data.account.balanceCents);
  for (const row of data.requests) {
    assert.equal(row.observedPriceKrw, null); assert.equal(row.hsCode, null); assert.equal(row.checkoutAvailable, false);
    if (row.quote) {
      assert.equal(row.quote.taxCents, null); assert.equal(row.quote.dutyCents, null);
      assert.equal(row.quote.totalCents, row.quote.subtotalCents);
      assert.equal(row.quote.exchangeRateKrwPerUsd, 1400);
    }
    assert.ok(row.events.every(event => event.source === 'developer_workspace_sample'));
  }
  const db = new DatabaseSync(store.databasePath, { readOnly: true });
  try {
    assert.match(db.prepare('SELECT encrypted_data FROM delivery_profiles LIMIT 1').get().encrypted_data, /^sample-v1:/);
    assert.match(db.prepare('SELECT options FROM purchase_requests LIMIT 1').get().options, /^sample-v1:/);
    assert.match(db.prepare('SELECT message FROM purchase_events LIMIT 1').get().message, /^sample-v1:/);
    assert.match(db.prepare('SELECT subject FROM purchase_support_tickets LIMIT 1').get().subject, /^sample-v1:/);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM ghost_sessions WHERE authenticated=0 AND sample_only=1').get().count, 3);
  } finally { db.close(); }
  assert.equal(statSync(join(directory, 'developer-workspace.key')).mode & 0o777, 0o600);
  assert.equal(statSync(store.databasePath).mode & 0o777, 0o600);
  const topped = store.applyAction(action({ action: 'top_up', amountCents: 10000 }));
  const again = openDeveloperWorkspace({ directory });
  try { assert.equal(again.getWorkspace(customerId).account.balanceCents, topped.account.balanceCents); assert.equal(again.getWorkspace(customerId).requests.length, 7); }
  finally { again.close(); }
  const bytes = readFileSync(store.databasePath);
  assert.equal(bytes.includes(Buffer.from('SAMPLE ONLY - DO NOT SHIP')), false);
}));

test('sample payment is atomic and idempotent across connections, binds input and prevents another owner or stale version', () => workspace((store, directory) => {
  const before = store.getWorkspace(customerId);
  const request = before.requests.find(row => row.status === 'PAYMENT_PENDING');
  const pay = action({ action: 'pay', requestId: request.id, version: request.version });
  const after = store.applyAction(pay);
  assert.equal(after.account.balanceCents, before.account.balanceCents - request.quote.totalCents);
  assert.equal(after.requests.find(row => row.id === request.id).status, 'PAID');
  assert.equal(after.payments.filter(row => row.requestId === request.id).length, 1);
  const second = openDeveloperWorkspace({ directory });
  try {
    assert.equal(second.applyAction(pay).account.balanceCents, after.account.balanceCents);
    assert.throws(() => second.applyAction({ ...pay, action: 'top_up', amountCents: 100 }), error => error.status === 409);
    assert.throws(() => second.applyAction({ ...pay, idempotencyKey: randomUUID() }), error => error.status === 409);
    const foreign = action({ action: 'pay', customerId: 'sample-customer-cn', requestId: request.id, version: 1 });
    assert.throws(() => second.applyAction(foreign), error => error.status === 404);
    assert.equal(second.getWorkspace(customerId).creditEntries.filter(row => row.requestId === request.id).length, 1);
  } finally { second.close(); }
}));

test('insufficient credit rolls back payment, request status, receipt and quota together', () => workspace(store => {
  const request = store.getWorkspace(customerId).requests.find(row => row.status === 'QUOTED');
  const db = new DatabaseSync(store.databasePath);
  try { db.prepare('UPDATE account_credits SET balance_cents=0 WHERE user_id=?').run(customerId); }
  finally { db.close(); }
  assert.throws(() => store.applyAction(action({ action: 'pay', requestId: request.id, version: request.version })), error => error.status === 422);
  const after = store.getWorkspace(customerId);
  assert.equal(after.requests.find(row => row.id === request.id).status, 'QUOTED');
  assert.equal(after.payments.some(row => row.requestId === request.id), false);
  const read = new DatabaseSync(store.databasePath, { readOnly: true });
  try { assert.equal(read.prepare('SELECT quota_count FROM users WHERE id=?').get(customerId).quota_count, 0); assert.equal(read.prepare('SELECT COUNT(*) AS count FROM action_receipts').get().count, 0); }
  finally { read.close(); }
}));

test('delivery advances only paid owned scenarios and support/request additions persist per customer', () => workspace(store => {
  const before = store.getWorkspace(customerId);
  const paid = before.requests.find(row => row.status === 'PAID');
  let current = paid;
  for (const expected of ['PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED']) {
    const data = store.applyAction(action({ action: 'advance_delivery', requestId: paid.id, version: current.version }));
    current = data.requests.find(row => row.id === paid.id); assert.equal(current.status, expected);
  }
  assert.equal(current.carrier, 'SAMPLE_ONLY'); assert.match(current.trackingNumber, /^SAMPLE-NOT-TRACKABLE-/);
  assert.throws(() => store.applyAction(action({ action: 'advance_delivery', requestId: paid.id, version: current.version })), error => error.status === 409);
  const send = action({ action: 'support', requestId: paid.id, subject: 'SAMPLE parcel question', message: 'SAMPLE request: please explain this fictional delivery.' });
  store.applyAction(send); store.applyAction(send);
  assert.equal(store.getWorkspace(customerId).requests.find(row => row.id === paid.id).tickets.length, 1);
  const create = action({ action: 'create_sample_request', productId: before.products[0].id });
  store.applyAction(create); const data = store.applyAction(create);
  assert.equal(data.requests.length, 8); assert.equal(store.getWorkspace('sample-customer-cn').requests.length, 7);
}));

test('profile changes preserve request snapshots and local quotas bound growth without deleting existing rows', () => workspace(store => {
  const before = store.getWorkspace(customerId);
  const db = new DatabaseSync(store.databasePath);
  const snapshot = db.prepare('SELECT encrypted_delivery FROM purchase_requests WHERE user_id=? LIMIT 1').get(customerId).encrypted_delivery;
  const delivery = { ...before.deliveryProfile, address1: 'SAMPLE Edited Local Address' };
  store.applyAction(action({ action: 'save_delivery', delivery }));
  assert.equal(store.getWorkspace(customerId).deliveryProfile.address1, delivery.address1);
  assert.equal(db.prepare('SELECT encrypted_delivery FROM purchase_requests WHERE user_id=? LIMIT 1').get(customerId).encrypted_delivery, snapshot);
  db.prepare('UPDATE users SET quota_day=?,quota_count=120 WHERE id=?').run(new Date().toISOString().slice(0, 10), customerId);
  assert.throws(() => store.applyAction(action({ action: 'top_up', amountCents: 100 })), error => error.status === 429);
  assert.equal(store.getWorkspace(customerId).account.balanceCents, before.account.balanceCents);
  db.close();
}));

test('unknown database marker and missing existing sample key fail closed without replacing data', () => {
  const directory = mkdtempSync(join(tmpdir(), 'paynship-workspace-marker-'));
  try {
    const path = join(directory, 'developer-workspace.sqlite');
    const db = new DatabaseSync(path); db.exec('CREATE TABLE precious_history(value TEXT); INSERT INTO precious_history VALUES(\'preserve\')'); db.close();
    assert.throws(() => openDeveloperWorkspace({ directory }), /unmarked/);
    assert.equal(existsSync(join(directory, 'developer-workspace.key')), false);
    const check = new DatabaseSync(path, { readOnly: true }); assert.equal(check.prepare('SELECT value FROM precious_history').get().value, 'preserve'); check.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
  workspace((store, directory) => {
    rmSync(join(directory, 'developer-workspace.key'));
    assert.throws(() => openDeveloperWorkspace({ directory }), /original local encryption key/);
    assert.equal(existsSync(join(directory, 'developer-workspace.key')), false);
  });
});

test('a different valid-format sample key cannot open a mutation path or alter balances and receipts', () => workspace((store, directory) => {
  const before = store.getWorkspace(customerId);
  writeFileSync(join(directory, 'developer-workspace.key'), 'b'.repeat(64) + '\n', { mode: 0o600 });
  assert.throws(() => openDeveloperWorkspace({ directory }), error => error.status === 503 && /encryption key/.test(error.message));
  const db = new DatabaseSync(store.databasePath, { readOnly: true });
  try {
    assert.equal(db.prepare('SELECT balance_cents FROM account_credits WHERE user_id=?').get(customerId).balance_cents, before.account.balanceCents);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM action_receipts').get().count, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM credit_entries WHERE user_id=?').get(customerId).count, before.creditEntries.length);
  } finally { db.close(); }
}));

test('response decryption failure rolls back a proposed credit mutation before commit', () => workspace(store => {
  const before = store.getWorkspace(customerId);
  const db = new DatabaseSync(store.databasePath);
  try {
    db.prepare('UPDATE purchase_events SET message=? WHERE request_id=?').run('corrupted-fixture-ciphertext', before.requests[0].id);
    assert.throws(() => store.applyAction(action({ action: 'top_up', amountCents: 10000 })), /encrypted sample data/);
    assert.equal(db.prepare('SELECT balance_cents FROM account_credits WHERE user_id=?').get(customerId).balance_cents, before.account.balanceCents);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM action_receipts').get().count, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM credit_entries WHERE user_id=?').get(customerId).count, before.creditEntries.length);
  } finally { db.close(); }
}));

test('version 1 fixture changes require migration before touching historical sample data', () => workspace((store, directory) => {
  const original = JSON.parse(readFileSync('features/workspace/fixtures/developer-workspace-fixtures.json', 'utf8'));
  const fixturePath = join(directory, 'changed-fixtures.json');
  const topped = store.applyAction(action({ action: 'top_up', amountCents: 10000 }));
  const historical = topped.requests.find(row => row.quote);
  const databaseBytes = readFileSync(store.databasePath);
  const edits = [
    fixture => { fixture.products[0].name = 'Estimated replacement product'; },
    fixture => { fixture.products[0].estimatedPriceKrw += 1000; },
    fixture => { fixture.scenario.exchangeRateKrwPerUsd += 100; },
    fixture => { fixture.products.pop(); },
  ];
  for (const edit of edits) {
    const fixture = structuredClone(original);
    edit(fixture);
    writeFileSync(fixturePath, JSON.stringify(fixture));
    assert.throws(() => openDeveloperWorkspace({ directory, fixturePath }), /explicit sample-data migration/);
    assert.deepEqual(readFileSync(store.databasePath), databaseBytes);
  }
  const reopened = openDeveloperWorkspace({ directory });
  try {
    const restored = reopened.getWorkspace(customerId);
    assert.equal(restored.account.balanceCents, topped.account.balanceCents);
    assert.deepEqual(restored.requests.find(row => row.id === historical.id), historical);
  } finally { reopened.close(); }
}));

test('fixture formatting and recursive object key order do not change the version 1 contract', () => workspace((store, directory) => {
  const original = JSON.parse(readFileSync('features/workspace/fixtures/developer-workspace-fixtures.json', 'utf8'));
  function reorder(value) {
    if (Array.isArray(value)) return value.map(reorder);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).reverse().map(key => [key, reorder(value[key])]));
    }
    return value;
  }
  const fixturePath = join(directory, 'reformatted-fixtures.json');
  writeFileSync(fixturePath, JSON.stringify(reorder(original), null, 4) + '\n');
  const before = store.getWorkspace(customerId);
  const reopened = openDeveloperWorkspace({ directory, fixturePath });
  try { assert.deepEqual(reopened.getWorkspace(customerId), before); }
  finally { reopened.close(); }
}));
