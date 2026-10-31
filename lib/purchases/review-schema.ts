import { z } from 'zod';
import { PRODUCT_CATEGORIES } from './categories';
import { recipientEvidenceSchema } from '@/lib/customs/recipient-evidence';

const cents = z.number().int().min(0).max(10000000);
const evidenceUrl = z.string().url().max(2048).refine(value => {
  const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password;
}, 'Use an HTTPS evidence URL without credentials.');

export const reviewSchema = z.object({
  verifiedCategory: z.enum(PRODUCT_CATEGORIES),
  productName: z.string().trim().min(3).max(200),
  productUnitPriceKrw: z.number().int().positive().max(100000000),
  domesticShippingKrw: z.number().int().min(0).max(1000000),
  exchangeRateKrwPerUsd: z.number().min(100).max(10000),
  serviceFeeCents: cents,
  internationalShippingCents: cents,
  insuranceCents: cents,
  customsValueBasis: z.enum(['CIF', 'FOB']),
  dutyBasisPoints: z.number().int().min(0).max(10000),
  taxBasisPoints: z.number().int().min(0).max(10000),
  taxIncludesDuty: z.boolean(),
  additionalTaxBaseCents: cents,
  hsCode: z.string().regex(/^\d{6,12}$/),
  origin: z.string().regex(/^[A-Z]{2}$/),
  material: z.string().trim().min(2).max(300),
  weightKg: z.number().positive().max(100),
  dimensions: z.object({ l: z.number().positive().max(300), w: z.number().positive().max(300), h: z.number().positive().max(300) }).strict(),
  rulesReference: evidenceUrl,
  evidenceReference: evidenceUrl,
  rulesVerifiedAt: z.string().datetime(),
  rulesValidUntil: z.string().datetime(),
  customsNotes: z.string().trim().min(10).max(2000),
  recipientEvidence: recipientEvidenceSchema,
  estimatedTransitDays: z.number().int().min(1).max(180).optional(),
}).strict();

export type PurchaseReview = z.infer<typeof reviewSchema>;

export const operatorActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('recipient_review'), version: z.number().int().nonnegative(), evidence: recipientEvidenceSchema }).strict(),
  z.object({ action: z.literal('reconcile_payment'), version: z.number().int().nonnegative(), draftId: z.string().regex(/^gid:\/\/shopify\/DraftOrder\/\d+$/) }).strict(),
  z.object({ action: z.literal('revalidate'), version: z.number().int().nonnegative(), review: reviewSchema }).strict(),
  z.object({ action: z.literal('resume'), version: z.number().int().nonnegative(), reason: z.string().trim().min(10).max(500) }).strict(),
  z.object({ action: z.literal('quote'), version: z.number().int().nonnegative(), review: reviewSchema }).strict(),
  z.object({ action: z.literal('reject'), version: z.number().int().nonnegative(), reason: z.string().trim().min(5).max(500) }).strict(),
  z.object({ action: z.literal('status'), version: z.number().int().nonnegative(),
    status: z.enum(['PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED', 'ON_HOLD']),
    message: z.string().trim().min(5).max(500), carrier: z.string().trim().min(2).max(60).optional(),
    trackingNumber: z.string().trim().min(3).max(100).optional() }).strict(),
]);
