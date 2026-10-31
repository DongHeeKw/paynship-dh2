import type { PurchaseReview } from '@/lib/purchases/review-schema';
import NumberField from './ReviewNumberField';
export default function ReviewCostFields({ review }: { review: PurchaseReview | null }) {
  return <fieldset className="form-stack"><legend className="section-heading">Confirmed costs</legend><div className="field-grid">
    <NumberField label="Unit product price (KRW)" name="productUnitPriceKrw" min={1} max={100000000} value={review?.productUnitPriceKrw} />
    <NumberField label="Domestic shipping (KRW)" name="domesticShippingKrw" max={1000000} value={review?.domesticShippingKrw ?? 0} />
    <NumberField label="Exchange rate (KRW per USD)" name="exchangeRateKrwPerUsd" min={100} max={10000} step={0.01} value={review?.exchangeRateKrwPerUsd} />
    <NumberField label="Service fee (USD)" name="serviceFee" max={100000} step={0.01} value={(review?.serviceFeeCents ?? 0) / 100} />
    <NumberField label="International shipping (USD)" name="internationalShipping" max={100000} step={0.01} value={review ? review.internationalShippingCents / 100 : undefined} />
    <NumberField label="Insurance (USD)" name="insurance" max={100000} step={0.01} value={(review?.insuranceCents ?? 0) / 100} />
  </div></fieldset>;
}
