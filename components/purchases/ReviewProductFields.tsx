import { PRODUCT_CATEGORIES } from '@/lib/purchases/categories';
import type { PurchaseReview } from '@/lib/purchases/review-schema';
import { CATEGORY_LABELS } from './labels';
import NumberField from './ReviewNumberField';
export default function ReviewProductFields({ review }: { review: PurchaseReview | null }) {
  return <fieldset className="form-stack"><legend className="section-heading">Verified product</legend>
    <label className="field">Product name<input name="productName" required minLength={3} maxLength={200} defaultValue={review?.productName} /></label>
    <label className="field">Verified category<select name="verifiedCategory" required defaultValue={review?.verifiedCategory || ''}><option value="" disabled>Select verified category</option>{PRODUCT_CATEGORIES.map(category => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label>
    <div className="field-grid"><label className="field">HS code<input name="hsCode" required pattern="[0-9]{6,12}" maxLength={12} inputMode="numeric" defaultValue={review?.hsCode} /><small>6–12 digits, verified for the destination.</small></label><label className="field">Country of origin<input name="origin" required pattern="[A-Z]{2}" maxLength={2} placeholder="ISO country code" defaultValue={review?.origin} /><small>Two uppercase letters; where the item was made.</small></label></div>
    <label className="field">Materials or composition<input name="material" required minLength={2} maxLength={300} defaultValue={review?.material} /></label>
    <div className="field-grid"><NumberField label="Verified weight (kg)" name="weightKg" min={0.001} max={100} step={0.001} value={review?.weightKg} /><NumberField label="Carrier transit estimate (days, optional)" name="estimatedTransitDays" min={1} max={180} required={false} value={review?.estimatedTransitDays} /></div>
    <div className="field-grid"><NumberField label="Package length (cm)" name="length" min={0.1} max={300} step={0.1} value={review?.dimensions.l} /><NumberField label="Package width (cm)" name="width" min={0.1} max={300} step={0.1} value={review?.dimensions.w} /><NumberField label="Package height (cm)" name="height" min={0.1} max={300} step={0.1} value={review?.dimensions.h} /></div>
  </fieldset>;
}
