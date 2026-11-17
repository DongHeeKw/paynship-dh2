import type { DeliveryProfile } from '@/lib/purchases/schemas';
import { countryPolicyNeedsRefresh, getCountryCustomsPolicy } from '@/lib/customs/country-policy';
import { validateRecipientEvidence, type RecipientEvidence } from '@/lib/customs/recipient-evidence';
import { countryName, formatDate } from './labels';

interface ReviewSummary {
  destination?: string;
  recipientEvidence?: RecipientEvidence;
  rulesVerifiedAt?: string;
  rulesValidUntil?: string;
  rulesReference?: string;
}
interface Props {
  country: string;
  delivery: DeliveryProfile;
  review: ReviewSummary | null;
  carrier: string | null;
  trackingNumber: string | null;
  now?: number;
}
const reviewWindow = 30 * 86400000;
const methodLabels: Record<RecipientEvidence['method'], string> = {
  NOT_REQUIRED: 'Operator reviewed identifier requirements', BROKER_REVIEW: 'Broker review recorded by operator',
  EZWAY_AUTHORIZATION: 'EZ WAY authorization reviewed by operator', CARRIER_ID_VERIFICATION: 'Carrier documents reviewed by operator',
};

function currentPeriod(checkedAt: string | undefined, validUntil: string | undefined, now: number) {
  const checked = Date.parse(checkedAt ?? '');
  const expiry = Date.parse(validUntil ?? '');
  return Number.isFinite(checked) && Number.isFinite(expiry) && checked <= now && checked >= now - reviewWindow && expiry > now && expiry <= now + reviewWindow && expiry > checked;
}
function displayDate(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? formatDate(value) : 'Not recorded';
}
function secureReference(value?: string) {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' && !url.username && !url.password ? value : null; }
  catch { return null; }
}

export default function RecipientClearanceStatus({ country, delivery, review, carrier, trackingNumber, now = Date.now() }: Props) {
  const policy = getCountryCustomsPolicy(country);
  const policyExpired = countryPolicyNeedsRefresh(country, now);
  const evidence = review?.recipientEvidence;
  let recipientState = 'Missing — review required';
  let recipientIssue = 'Record current recipient evidence for this request.';
  let recipientCurrent = false;
  if (evidence) {
    if (!currentPeriod(evidence.verifiedAt, evidence.validUntil, now)) {
      recipientState = 'Expired or invalid — review required';
      recipientIssue = 'Recipient evidence dates are expired, future-dated or outside the review window.';
    } else {
      try {
        validateRecipientEvidence(country, delivery, evidence, now);
        recipientState = 'Operator review recorded'; recipientCurrent = true; recipientIssue = '';
      } catch (error) { recipientState = 'Review required'; recipientIssue = error instanceof Error ? error.message : 'Recipient evidence needs review.'; }
    }
  }
  const destinationMatches = review?.destination === country;
  const rulesCurrent = destinationMatches && currentPeriod(review?.rulesVerifiedAt, review?.rulesValidUntil, now);
  const rulesState = review && !destinationMatches ? 'Destination mismatch — review required' : !review?.rulesVerifiedAt || !review.rulesValidUntil ? 'Missing — review required' : rulesCurrent ? 'Current operator review period' : 'Expired or invalid — review required';
  const shipmentBound = ['CN', 'TW'].includes(country);
  const shipmentMatches = Boolean(trackingNumber && evidence?.shipmentReference === trackingNumber);
  const shipmentState = !shipmentBound ? 'Route-specific review required; no built-in reference match rule'
    : !evidence?.shipmentReference ? 'Missing shipment evidence reference'
      : !trackingNumber ? 'Tracking number not assigned; match pending'
        : shipmentMatches ? 'Reference matches this shipment' : 'Mismatch — shipment review required';
  const evidenceReference = secureReference(evidence?.reference);
  const rulesReference = secureReference(review?.rulesReference);
  const needsReview = !recipientCurrent || !rulesCurrent || policyExpired || (shipmentBound && !shipmentMatches);

  return <section className="detail-section" aria-labelledby="recipient-clearance-heading">
    <h2 id="recipient-clearance-heading" className="section-heading">Recipient & customs review status</h2>
    <p className="notice" role="status">{needsReview ? 'Review or shipment evidence is still needed. Missing, expired or mismatched evidence must be resolved before the corresponding operation.' : 'Operator evidence is recorded for this request. This is not a government or carrier clearance result.'}</p>
    <dl className="detail-grid">
      <dt>Destination policy</dt><dd>{countryName(country)} · {policy.id}</dd>
      <dt>Identity/provider verification</dt><dd>Not performed by this service</dd>
      <dt>Recipient evidence</dt><dd>{recipientState}{recipientIssue && <p className="muted">{recipientIssue}</p>}</dd>
      <dt>Recorded method</dt><dd>{evidence ? methodLabels[evidence.method] ?? 'Unknown — review required' : 'Not recorded'}</dd>
      <dt>Recipient evidence checked</dt><dd>{displayDate(evidence?.verifiedAt)}</dd>
      <dt>Recipient evidence expires</dt><dd>{displayDate(evidence?.validUntil)}</dd>
      <dt>Product/customs review period</dt><dd>{rulesState}</dd>
      <dt>Product/customs review expires</dt><dd>{displayDate(review?.rulesValidUntil)}</dd>
      <dt>Built-in guidance review</dt><dd>{policyExpired ? 'Overdue — refresh required' : policy.reviewDueAt ? 'Within configured review period' : 'No configured source deadline'} · {displayDate(policy.reviewDueAt)}</dd>
      <dt>Official sources in policy</dt><dd>{policy.sources.length ? <ul>{policy.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{source.title}</a> · checked {source.checkedAt}</li>)}</ul> : 'None recorded. Obtain route-specific evidence from the contracted carrier or broker.'}</dd>
      <dt>Carrier</dt><dd>{carrier ?? 'Not assigned'}</dd>
      <dt>Tracking number</dt><dd>{trackingNumber ?? 'Not assigned'}</dd>
      <dt>Recipient shipment evidence</dt><dd>{shipmentState}</dd>
      <dt>Evidence references</dt><dd>{evidenceReference ? <a href={evidenceReference} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open restricted recipient evidence</a> : 'Recipient reference not recorded'}{rulesReference && <p><a href={rulesReference} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open operator rules source</a></p>}</dd>
    </dl>
    <p className="muted mt-5">PCCC is not a universal overseas recipient number. Keep national IDs, passports and SSNs in the contracted provider’s secure process. A manual review, matching tracking reference or valid date does not prove identity, customs eligibility or completed clearance.</p>
  </section>;
}
