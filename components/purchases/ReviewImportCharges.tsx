'use client';
import { useState } from 'react';
import type { PurchaseReview } from '@/lib/purchases/review-schema';
import NumberField from './ReviewNumberField';

export default function ReviewImportCharges({ review, country, revalidate }: { review: PurchaseReview | null; country: string; revalidate: boolean }) {
  const required = !revalidate && ['US', 'CN', 'JP'].includes(country);
  const [verified, setVerified] = useState(Boolean(review?.verifiedImportCharges) || required);
  return <fieldset className="form-stack"><legend className="section-heading">Import charge assessment</legend>
    <p className="notice">For the USA, China and Japan, enter the carrier/broker or customs assessment for the exact goods, origin and import route. Include its evidence URL and calculation details in the customs fields below. Apply the country’s own valuation, currency and rounding rules before converting the approved amounts to USD. Zero must also be supported by evidence.</p>
    <label className="field">Calculation method<select name="importChargeMethod" value={verified ? 'VERIFIED_AMOUNTS' : 'REVIEWED_AD_VALOREM'} onChange={event => setVerified(event.target.value === 'VERIFIED_AMOUNTS')}><option value="VERIFIED_AMOUNTS">Verified duty, tax and clearance amounts</option>{!required && <option value="REVIEWED_AD_VALOREM">Existing reviewed ad-valorem calculation</option>}</select></label>
    {verified && <div className="field-grid">
      <NumberField label="Verified import duty (USD)" name="verifiedDuty" max={100000} step={0.01} value={review?.verifiedImportCharges ? review.verifiedImportCharges.dutyCents / 100 : undefined} />
      <NumberField label="Verified import taxes (USD)" name="verifiedTax" max={100000} step={0.01} value={review?.verifiedImportCharges ? review.verifiedImportCharges.taxCents / 100 : undefined} />
      <NumberField label="Verified clearance fees (USD)" name="verifiedClearance" max={100000} step={0.01} value={review?.verifiedImportCharges ? review.verifiedImportCharges.clearanceCents / 100 : undefined} />
    </div>}
    {verified && <p className="muted">The entered amounts replace the generic duty/tax formula. Rate and valuation fields remain supporting review information; they do not add a second tax.</p>}
  </fieldset>;
}
