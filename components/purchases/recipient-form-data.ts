import { recipientEvidenceSchema } from '@/lib/customs/recipient-evidence';
import { formIsoDateTime } from './form-date';

export function parseRecipientEvidenceForm(fields: FormData) {
  const value = (name: string) => String(fields.get(name) || '').trim();
  return recipientEvidenceSchema.parse({
    method: value('recipientMethod'), reference: value('recipientReference'),
    verifiedAt: formIsoDateTime(value('recipientVerifiedAt')),
    validUntil: formIsoDateTime(value('recipientValidUntil')),
    notes: value('recipientNotes'),
    ...(value('recipientShipmentReference') ? { shipmentReference: value('recipientShipmentReference') } : {}),
  });
}
