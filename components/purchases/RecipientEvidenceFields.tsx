import { getCountryCustomsPolicy } from '@/lib/customs/country-policy';
import type { RecipientEvidence } from '@/lib/customs/recipient-evidence';
import { formLocalDateTime } from './form-date';

const METHOD_LABELS = {
  NOT_REQUIRED: 'Confirmed no extra recipient identifier needed for this route',
  BROKER_REVIEW: 'Customs broker review',
  EZWAY_AUTHORIZATION: 'Taiwan EZ WAY authorization',
  CARRIER_ID_VERIFICATION: 'Indonesia carrier recipient-document review',
};

export default function RecipientEvidenceFields({ country, evidence }: { country: string; evidence?: RecipientEvidence | null }) {
  const policy = getCountryCustomsPolicy(country);
  const methods = country === 'TW' ? ['BROKER_REVIEW', 'EZWAY_AUTHORIZATION'] as const
    : country === 'ID' ? ['BROKER_REVIEW', 'CARRIER_ID_VERIFICATION'] as const
    : policy.requirement === 'NONE_BY_DEFAULT' ? ['NOT_REQUIRED', 'BROKER_REVIEW'] as const
    : ['BROKER_REVIEW'] as const;

  return <fieldset className="form-stack">
    <legend className="section-heading">Recipient clearance evidence</legend>
    <p className="notice">{policy.customerHint}</p>
    <label className="field">Review method
      <select name="recipientMethod" required defaultValue={evidence?.method || ''}>
        <option value="" disabled>Select the reviewed method</option>
        {methods.map(method => <option key={method} value={method}>{METHOD_LABELS[method]}</option>)}
      </select>
      <small>This records an operator review. It does not claim an automated government identity check.</small>
    </label>
    <label className="field">Official requirements or secure carrier/broker evidence reference
      <input type="url" name="recipientReference" required maxLength={2048} defaultValue={evidence?.reference} placeholder="https://..." />
      <small>Use a secure record reference. Do not put identity numbers in a public URL.</small>
    </label>
    <div className="field-grid">
      <label className="field">Recipient evidence checked at
        <input type="datetime-local" name="recipientVerifiedAt" required defaultValue={formLocalDateTime(evidence?.verifiedAt)} />
      </label>
      <label className="field">Recipient evidence review valid until
        <input type="datetime-local" name="recipientValidUntil" required defaultValue={formLocalDateTime(evidence?.validUntil)} />
        <small>Future date within 30 days; review again if the shipment or recipient changes.</small>
      </label>
    </div>
    {country === 'TW' && <label className="field">Authorized shipment / airwaybill reference
      <input name="recipientShipmentReference" minLength={3} maxLength={100} defaultValue={evidence?.shipmentReference} />
      <small>Required before dispatch, matching the shipment tracking reference. Leave blank for a pre-purchase authorization plan.</small>
    </label>}
    <label className="field">Recipient review notes
      <textarea name="recipientNotes" required minLength={10} maxLength={1000} defaultValue={evidence?.notes} placeholder="What documents or authorization were checked, by whom, and through which secure broker/carrier process?" />
      <small>Do not copy national ID, passport, SSN, or card numbers into these notes.</small>
    </label>
    {policy.sources.length > 0 && <p className="muted">
      <a href={policy.sources[0].url} target="_blank" rel="noopener noreferrer">Official destination guidance</a> · source checked {policy.sources[0].checkedAt}
    </p>}
  </fieldset>;
}
