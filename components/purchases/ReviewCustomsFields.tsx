import type { PurchaseReview } from '@/lib/purchases/review-schema';
import NumberField from './ReviewNumberField';
function localDateTime(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export default function ReviewCustomsFields({ review }: { review: PurchaseReview | null }) {
  return <fieldset className="form-stack"><legend className="section-heading">Destination rules & evidence</legend>
    <div className="field-grid"><label className="field">Customs valuation basis<select name="customsValueBasis" required defaultValue={review?.customsValueBasis || ''}><option value="" disabled>Select the destination&apos;s basis</option><option value="CIF">CIF — product, freight & insurance</option><option value="FOB">FOB — product & domestic shipping</option></select></label><label className="field">Does the tax base include import duty?<select name="taxIncludesDuty" required defaultValue={review ? String(review.taxIncludesDuty) : ''}><option value="" disabled>Select after checking rules</option><option value="true">Yes</option><option value="false">No</option></select></label></div>
    <div className="field-grid"><NumberField label="Import duty rate (%)" name="dutyRate" max={100} step={0.01} value={review ? review.dutyBasisPoints / 100 : undefined} /><NumberField label="Import tax rate (%)" name="taxRate" max={100} step={0.01} value={review ? review.taxBasisPoints / 100 : undefined} /><NumberField label="Additional taxable base (USD)" name="additionalTaxBase" max={100000} step={0.01} value={(review?.additionalTaxBaseCents ?? 0) / 100} /></div>
    <label className="field">Destination rules source<input type="url" name="rulesReference" required maxLength={2048} placeholder="https://official-customs-source..." defaultValue={review?.rulesReference} /></label>
    <label className="field">Product evidence source<input type="url" name="evidenceReference" required maxLength={2048} placeholder="https://seller-or-manufacturer..." defaultValue={review?.evidenceReference} /></label>
    <div className="field-grid"><label className="field">Rules checked at<input type="datetime-local" name="rulesVerifiedAt" required defaultValue={localDateTime(review?.rulesVerifiedAt)} /></label><label className="field">Rules valid until<input type="datetime-local" name="rulesValidUntil" required defaultValue={localDateTime(review?.rulesValidUntil)} /><small>Within the next 30 days. Quotes expire within 24 hours.</small></label></div>
    <label className="field">Customs review notes<textarea name="customsNotes" required minLength={10} maxLength={2000} defaultValue={review?.customsNotes} placeholder="Eligibility, restrictions, permits, valuation, and the evidence supporting this decision." /></label>
  </fieldset>;
}
