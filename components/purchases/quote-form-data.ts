import { reviewSchema } from '@/lib/purchases/review-schema';
import { parseRecipientEvidenceForm } from './recipient-form-data';
import { formIsoDateTime } from './form-date';
import { decimalToMinor } from '@/lib/purchases/money';

export function parseQuoteForm(fields: FormData) {
  const value = (name: string) => String(fields.get(name) ?? '').trim();
  const number = (name: string) => Number(value(name));
  const cents = (name: string) => decimalToMinor(value(name) || '0');
  return reviewSchema.parse({
    verifiedCategory: value('verifiedCategory'), productName: value('productName'),
    productUnitPriceKrw: number('productUnitPriceKrw'), domesticShippingKrw: number('domesticShippingKrw'),
    exchangeRateKrwPerUsd: number('exchangeRateKrwPerUsd'), serviceFeeCents: cents('serviceFee'),
    ...(value('importChargeMethod') === 'VERIFIED_AMOUNTS' ? { verifiedImportCharges: { dutyCents: decimalToMinor(value('verifiedDuty')), taxCents: decimalToMinor(value('verifiedTax')), clearanceCents: decimalToMinor(value('verifiedClearance')) } } : {}),
    internationalShippingCents: cents('internationalShipping'), insuranceCents: cents('insurance'),
    customsValueBasis: value('customsValueBasis'), dutyBasisPoints: cents('dutyRate'),
    taxBasisPoints: cents('taxRate'), taxIncludesDuty: value('taxIncludesDuty') === 'true',
    additionalTaxBaseCents: cents('additionalTaxBase'), hsCode: value('hsCode'), origin: value('origin'),
    material: value('material'), weightKg: number('weightKg'),
    dimensions: { l: number('length'), w: number('width'), h: number('height') },
    rulesReference: value('rulesReference'), evidenceReference: value('evidenceReference'),
    rulesVerifiedAt: formIsoDateTime(value('rulesVerifiedAt')), rulesValidUntil: formIsoDateTime(value('rulesValidUntil')),
    customsNotes: value('customsNotes'), recipientEvidence: parseRecipientEvidenceForm(fields),
    ...(value('estimatedTransitDays') ? { estimatedTransitDays: number('estimatedTransitDays') } : {}),
  });
}
