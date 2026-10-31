import type { CustomsVerificationSnapshot } from '@/lib/customs/types';

export default function CustomsVerificationNotice({ snapshot }: { snapshot: CustomsVerificationSnapshot | null }) {
  if (!snapshot) return null;
  const message = snapshot.state === 'NOT_REQUIRED' ? 'No personal ID is needed at this profile stage. Product and shipment requirements still need review.'
    : snapshot.state === 'FORMAT_ONLY' ? 'Identifier format checked. We have not verified its issuance or that it belongs to the recipient.'
    : 'Recipient documents or authorization need review before fulfilment.';
  return <p className="notice" role="status">{message}</p>;
}
