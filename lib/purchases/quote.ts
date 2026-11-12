import { intakeDecision } from './categories';
import { PurchaseError } from './errors';
import { reviewSchema, type PurchaseReview } from './review-schema';
import { customsCodeInServiceScope } from '@/lib/customs/service-scope';
import { applyBasisPoints, krwToUsdCents } from './money';
import { calculateServiceFeeKrw, SERVICE_FEE_POLICY } from './service-fee';

export interface PurchaseQuote {
  currency: 'USD'; productName: string; productCents: number; domesticShippingCents: number;
  serviceFeeCents: number; internationalShippingCents: number; insuranceCents: number;
  dutyCents: number; taxCents: number; totalCents: number; quoteVersion: number;
  estimatedTransitDays?: number;
  serviceFeePolicy?: string; serviceFeeKrw?: number; exchangeRateKrwPerUsd?: number;
  clearanceCents?: number; importChargeMethod?: 'VERIFIED_AMOUNTS' | 'REVIEWED_AD_VALOREM';
}

// No country-rate guesses, FTA assumptions, de-minimis rules or VAT profit offsets.
// The operator supplies dated sources and verified facts; arithmetic is reproducible.
export function calculatePurchaseQuote(input: PurchaseReview, quantity: number, quoteVersion: number, now = Date.now(), pricing: 'CURRENT' | 'LEGACY' = 'CURRENT'): PurchaseQuote {
  const review = reviewSchema.parse(input);
  if (intakeDecision(review.verifiedCategory) === 'OUT_OF_SCOPE') throw new PurchaseError(422, 'This category is outside the current service scope.');
  if (!customsCodeInServiceScope(review.hsCode)) throw new PurchaseError(422, 'This customs chapter is outside the current service scope. A separate broker route is required.');
  const verified = Date.parse(review.rulesVerifiedAt);
  const expires = Date.parse(review.rulesValidUntil);
  if (verified > now || verified < now - 30 * 86400000 || expires <= now || expires > now + 30 * 86400000) {
    throw new PurchaseError(422, 'The customs rules must be recently verified and expire within 30 days.');
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new PurchaseError(422, 'Invalid product quantity.');
  if (!Number.isSafeInteger(quoteVersion) || quoteVersion < 1) throw new PurchaseError(422, 'Invalid quote version.');
  // Legacy arithmetic is retained only for revalidating already-paid historical quotes.
  const convert = pricing === 'LEGACY' ? (won: number) => Math.round(won * 100 / review.exchangeRateKrwPerUsd) : (won: number) => krwToUsdCents(won, review.exchangeRateKrwPerUsd);
  const percentage = pricing === 'LEGACY' ? (amount: number, bps: number) => Math.round(amount * bps / 10000) : applyBasisPoints;
  const productSubtotalKrw = review.productUnitPriceKrw * quantity;
  const productCents = convert(productSubtotalKrw);
  const domesticShippingCents = convert(review.domesticShippingKrw);
  const serviceFeeKrw = calculateServiceFeeKrw(productSubtotalKrw);
  const serviceFeeCents = pricing === 'LEGACY' ? review.serviceFeeCents : convert(serviceFeeKrw);
  const customsValue = productCents + (review.customsValueBasis === 'CIF' ? review.internationalShippingCents + review.insuranceCents : 0);
  const dutyCents = review.verifiedImportCharges?.dutyCents ?? percentage(customsValue, review.dutyBasisPoints);
  const taxBase = customsValue + review.additionalTaxBaseCents + (review.taxIncludesDuty ? dutyCents : 0);
  const taxCents = review.verifiedImportCharges?.taxCents ?? percentage(taxBase, review.taxBasisPoints);
  const clearanceCents = review.verifiedImportCharges?.clearanceCents ?? 0;
  const totalCents = productCents + domesticShippingCents + serviceFeeCents + review.internationalShippingCents + review.insuranceCents + dutyCents + taxCents + clearanceCents;
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || totalCents > 10000000) throw new PurchaseError(422, 'Quote exceeds the service limit.');
  return { currency: 'USD', productName: review.productName, productCents, domesticShippingCents, serviceFeeCents,
    internationalShippingCents: review.internationalShippingCents, insuranceCents: review.insuranceCents,
    dutyCents, taxCents, totalCents, quoteVersion, ...(pricing === 'CURRENT' ? { serviceFeePolicy: SERVICE_FEE_POLICY.id, serviceFeeKrw, exchangeRateKrwPerUsd: review.exchangeRateKrwPerUsd, clearanceCents, importChargeMethod: review.verifiedImportCharges ? 'VERIFIED_AMOUNTS' as const : 'REVIEWED_AD_VALOREM' as const } : {}), ...(review.estimatedTransitDays ? { estimatedTransitDays: review.estimatedTransitDays } : {}) };
}
