import { validateRecipientEvidence, type RecipientEvidence } from '@/lib/customs/recipient-evidence';
import { readStoredDeliveryProfile } from '@/lib/customs/delivery';
import { decryptPii } from './pii';
import { PurchaseError } from './errors';

export function reviewRecipient(row: { id: string; destination: string; encryptedDelivery: string }, evidence: RecipientEvidence, stage: 'quote' | 'purchasing' | 'shipping' = 'quote', trackingNumber?: string) {
  const delivery = readStoredDeliveryProfile(decryptPii(row.encryptedDelivery, `request:${row.id}`));
  // A broker plan may resolve a customer's deferred route for this request.
  // Neither the customer's profile nor identityVerified is changed.
  if (delivery.country === 'TW' && delivery.customsAuthorization === 'DEFERRED') {
    delivery.customsAuthorization = evidence.method === 'EZWAY_AUTHORIZATION' ? 'EZWAY' : 'BROKER';
  }
  try { validateRecipientEvidence(row.destination, delivery, evidence, Date.now(), stage, trackingNumber); }
  catch (error) { throw new PurchaseError(422, error instanceof Error ? error.message : 'Recipient evidence is incomplete.'); }
  return delivery;
}
