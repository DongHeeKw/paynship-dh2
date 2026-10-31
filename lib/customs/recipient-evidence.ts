import { z } from 'zod';
import { countryPolicyNeedsRefresh, getCountryCustomsPolicy } from './country-policy';
import type { DeliveryProfile } from './delivery-schema';

export const RECIPIENT_EVIDENCE_METHODS = ['NOT_REQUIRED', 'BROKER_REVIEW', 'EZWAY_AUTHORIZATION', 'CARRIER_ID_VERIFICATION'] as const;
export const recipientEvidenceSchema = z.object({
  method: z.enum(RECIPIENT_EVIDENCE_METHODS),
  reference: z.string().url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  }, 'Use a secure source or carrier/broker evidence reference.'),
  verifiedAt: z.string().datetime(),
  validUntil: z.string().datetime(),
  notes: z.string().trim().min(10).max(1000),
  shipmentReference: z.string().trim().min(3).max(100).optional(),
}).strict();
export type RecipientEvidence = z.infer<typeof recipientEvidenceSchema>;

const REVIEW_WINDOW_MS = 30 * 86400000;

// This records an operator's review of external evidence, not a government or
// carrier API identity verification. It never creates PROVIDER_VERIFIED state.
export function validateRecipientEvidence(destination: string, delivery: DeliveryProfile, input: unknown, now = Date.now(), stage: 'quote' | 'purchasing' | 'shipping' = 'quote', trackingNumber?: string | null): RecipientEvidence {
  const evidence = recipientEvidenceSchema.parse(input);
  if (destination !== delivery.country) throw new Error('Recipient evidence must match the request destination.');
  if (countryPolicyNeedsRefresh(destination, now)) throw new Error('The destination recipient policy needs a source refresh before approval.');
  const checked = Date.parse(evidence.verifiedAt);
  const expiry = Date.parse(evidence.validUntil);
  if (checked > now || now - checked > REVIEW_WINDOW_MS || expiry <= now || expiry > now + REVIEW_WINDOW_MS || expiry <= checked) {
    throw new Error('Current recipient evidence with a future review expiry within 30 days is required.');
  }
  const policy = getCountryCustomsPolicy(destination);
  if (evidence.method === 'NOT_REQUIRED' && policy.requirement !== 'NONE_BY_DEFAULT') throw new Error('This destination requires a broker or recipient-document review.');
  if (evidence.method === 'EZWAY_AUTHORIZATION' && (destination !== 'TW' || delivery.customsAuthorization !== 'EZWAY')) throw new Error('EZ WAY evidence must match a Taiwan EZ WAY recipient route.');
  if (evidence.method === 'CARRIER_ID_VERIFICATION' && destination !== 'ID') throw new Error('Direct carrier identifier review is limited to the configured Indonesia route.');
  if (destination === 'TW' && !['BROKER_REVIEW', 'EZWAY_AUTHORIZATION'].includes(evidence.method)) throw new Error('Taiwan recipient authorization requires broker or EZ WAY review.');
  if (destination === 'ID' && !['BROKER_REVIEW', 'CARRIER_ID_VERIFICATION'].includes(evidence.method)) throw new Error('Indonesia recipient documents require broker or carrier review.');
  if (destination === 'TW' && stage === 'shipping') {
    if (!trackingNumber || evidence.shipmentReference !== trackingNumber) throw new Error('Taiwan shipping requires recipient authorization evidence for this shipment reference.');
    if (delivery.customsAuthorization === 'DEFERRED') throw new Error('Resolve the Taiwan recipient authorization route before dispatch.');
    if (delivery.customsAuthorization === 'EZWAY' && evidence.method !== 'EZWAY_AUTHORIZATION') throw new Error('Record the recipient authorization for this EZ WAY shipment before dispatch.');
    if (delivery.customsAuthorization === 'BROKER' && evidence.method !== 'BROKER_REVIEW') throw new Error('Record the broker authorization for this shipment before dispatch.');
  }
  return evidence;
}
