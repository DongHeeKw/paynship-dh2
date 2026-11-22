import { readFileSync, writeFileSync } from 'node:fs';

const [,, output] = process.argv;
if (!output) {
  console.error('Usage: node scripts/ci/make-pre-purchase-schema.mjs <output.prisma>');
  process.exit(1);
}

const full = readFileSync('prisma/schema.prisma', 'utf8');
const startMarker = '// URL purchase flow. Historical chat/order tables remain for data preservation only.';
const endMarker = '// 유저 선호도 - LLM이 참조하는 영구 메모리';
const start = full.indexOf(startMarker);
const end = full.indexOf(endMarker);
if (start < 0 || end < start || full.indexOf(startMarker, start + 1) !== -1) {
  throw new Error('Cannot derive one unambiguous pre-purchase baseline; review schema first.');
}

let legacy = full.slice(0, start) + full.slice(end);
const expectedUserRelations = [
  /^\s+deliveryProfile\s+DeliveryProfile\?\s*$/m,
  /^\s+purchaseRequests\s+PurchaseRequest\[\]\s*$/m,
];
for (const pattern of expectedUserRelations) {
  if (!pattern.test(legacy)) {
    throw new Error('Expected pre-purchase User relation not found. Do not silently guess migration baseline.');
  }
  legacy = legacy.replace(pattern, '');
}

if (/\b(model (DeliveryProfile|PurchaseRequest|PurchaseEvent|PurchaseSupportTicket|PurchaseQuota|PurchaseWebhookReceipt)\b|DeliveryProfile\?|PurchaseRequest\[\])/.test(legacy)) {
  throw new Error('Purchase-era models leaked into pre-purchase baseline.');
}
writeFileSync(output, legacy, 'utf8');
console.log('Derived disposable legacy baseline from known current schema (purchase models excluded).');
