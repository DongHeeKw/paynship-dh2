import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { z } from 'zod';

// Version 1 is immutable: historical requests still resolve these definitions.
// A changed payload needs an explicit data migration and reviewed version,
// rather than updating this fingerprint to reinterpret existing records.
const VERSION_1_FINGERPRINT = 'ef27201e22776615c2fd56e4f1080676d8eb6eded2e65b47f84255606ec8b20a';
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

const country = z.enum(['CN', 'JP', 'US']);
const profile = z.object({
  fullName: z.string().startsWith('SAMPLE '), phone: z.literal('+12025550101'), country,
  address1: z.literal('SAMPLE ONLY - DO NOT SHIP'), address2: z.literal(''), city: z.string().startsWith('Sample City '),
  region: z.string().startsWith('Sample Region '), postalCode: z.enum(['000000', '000-0000', '00000']),
  customsId: z.literal(''), customsIdType: z.literal('NONE'), customsAuthorization: z.enum(['NONE', 'BROKER']),
}).strict();
const cents = z.number().int().nonnegative().max(1000000);
const schema = z.object({
  schemaVersion: z.literal(1), sampleOnly: z.literal(true), initializedAt: z.string().datetime(), notice: z.string().min(50),
  scenario: z.object({ currency: z.literal('USD'), exchangeRateKrwPerUsd: z.number().int().min(100).max(10000),
    openingCreditCents: cents, domesticShippingCents: cents, serviceFeeCents: cents, internationalShippingCents: cents, insuranceCents: cents }).strict(),
  customers: z.array(z.object({ id: z.enum(['sample-customer-cn', 'sample-customer-jp', 'sample-customer-us']),
    email: z.string().email().endsWith('@example.invalid'), name: z.string().startsWith('SAMPLE '), country, profile }).strict()).length(3),
  products: z.array(z.object({ id: z.string().regex(/^sample-naver-[a-z-]+$/),
    sourceUrl: z.string().url().refine(value => /^https:\/\/(?:smartstore|brand)\.naver\.com\/[^/?#]+\/products\/\d+$/.test(value)),
    name: z.string().startsWith('Estimated '), category: z.enum(['household', 'clothing', 'books']), options: z.string().startsWith('SAMPLE estimate:'),
    estimatedPriceKrw: z.number().int().positive().max(1000000), observedPriceKrw: z.null(), hsCode: z.null(), evidenceStatus: z.literal('UNVERIFIED_ESTIMATE') }).strict()).min(2).max(10),
  requestScenarios: z.array(z.object({ key: z.string().regex(/^[a-z]+$/),
    status: z.enum(['REVIEW_REQUIRED', 'QUOTED', 'PAYMENT_PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'ON_HOLD']), productId: z.string(), quantity: z.number().int().min(1).max(10) }).strict()).min(5).max(20),
}).strict();

export function loadWorkspaceFixtures(path) {
  const payload = JSON.parse(readFileSync(path, 'utf8'));
  const fingerprint = createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
  if (fingerprint !== VERSION_1_FINGERPRINT) {
    throw new Error('Developer workspace fixture definitions changed. An explicit sample-data migration and reviewed fixture version are required before opening the database.');
  }
  const data = schema.parse(payload);
  for (const rows of [data.customers.map(row => row.id), data.customers.map(row => row.country), data.products.map(row => row.id), data.requestScenarios.map(row => row.key)]) {
    if (new Set(rows).size !== rows.length) throw new Error('Developer sample fixture identifiers must be unique.');
  }
  for (const customer of data.customers) if (customer.country !== customer.profile.country) throw new Error('Sample customer countries must agree.');
  for (const row of data.requestScenarios) if (!data.products.some(product => product.id === row.productId)) throw new Error('Unknown sample product reference.');
  return data;
}
