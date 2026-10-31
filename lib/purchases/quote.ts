import { intakeDecision } from './categories';
import { PurchaseError } from './errors';
import { reviewSchema, type PurchaseReview } from './review-schema';
import { customsCodeInServiceScope } from '@/lib/customs/service-scope';

export interface PurchaseQuote {
  currency: 'USD'; productName: string; productCents: number; domesticShippingCents: number;
  serviceFeeCents: number; internationalShippingCents: number; insuranceCents: number;
  dutyCents: number; taxCents: number; totalCents: number; quoteVersion: number;
  estimatedTransitDays?: number;
}

// No country-rate guesses, FTA assumptions, de-minimis rules or VAT profit offsets.
// The operator supplies dated sources and verified facts; arithmetic is reproducible.
export function calculatePurchaseQuote(input: PurchaseReview, quantity: number, quoteVersion: number, now = Date.now()): PurchaseQuote {
  const review = reviewSchema.parse(input);
  if (intakeDecision(review.verifiedCategory) === 'OUT_OF_SCOPE') throw new PurchaseError(422, 'This category is outside the current service scope.');
  if (!customsCodeInServiceScope(review.hsCode)) throw new PurchaseError(422, 'This customs chapter is outside the current service scope. A separate broker route is required.');
  const verified = Date.parse(review.rulesVerifiedAt);
  const expires = Date.parse(review.rulesValidUntil);
  if (verified > now || verified < now - 30 * 86400000 || expires <= now || expires > now + 30 * 86400000) {
    throw new PurchaseError(422, 'The customs rules must be recently verified and expire within 30 days.');
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new PurchaseError(422, 'Invalid product quantity.');
  const productCents = Math.round(review.productUnitPriceKrw * quantity * 100 / review.exchangeRateKrwPerUsd);
  const domesticShippingCents = Math.round(review.domesticShippingKrw * 100 / review.exchangeRateKrwPerUsd);
  const customsValue = productCents + (review.customsValueBasis === 'CIF' ? review.internationalShippingCents + review.insuranceCents : 0);
  const dutyCents = Math.round(customsValue * review.dutyBasisPoints / 10000);
  const taxBase = customsValue + review.additionalTaxBaseCents + (review.taxIncludesDuty ? dutyCents : 0);
  const taxCents = Math.round(taxBase * review.taxBasisPoints / 10000);
  const totalCents = productCents + domesticShippingCents + review.serviceFeeCents + review.internationalShippingCents + review.insuranceCents + dutyCents + taxCents;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || totalCents > 10000000) throw new PurchaseError(422, 'Quote exceeds the service limit.');
  return { currency: 'USD', productName: review.productName, productCents, domesticShippingCents, serviceFeeCents: review.serviceFeeCents,
    internationalShippingCents: review.internationalShippingCents, insuranceCents: review.insuranceCents,
    dutyCents, taxCents, totalCents, quoteVersion, ...(review.estimatedTransitDays ? { estimatedTransitDays: review.estimatedTransitDays } : {}) };
}
