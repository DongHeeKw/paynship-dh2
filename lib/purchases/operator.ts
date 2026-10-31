import { prisma } from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import { operatorActionSchema } from './review-schema';
import { calculatePurchaseQuote } from './quote';
import { TRANSITIONS, type PurchaseStatus } from './status';
import { purchaseTransaction } from './transaction';
import { consumeQuota } from './quota';
import { PurchaseError } from './errors';
import { decryptPii, encryptPii } from './pii';
import type { DeliveryProfile } from './schemas';
import { getPurchaseForOperator, purchaseDto } from './read';
import { reconcilePurchasePayment } from './operator-payment';
import type { PurchaseQuote } from './quote';
import { openReview, sealReview } from './review-storage';
import { reviewRecipient } from './recipient-review';
import { purchaseEventFields } from './event-record';

export async function getOperatorPurchase(id: string, actorId: string) {
  await purchaseTransaction(async tx => {
    await consumeQuota(tx, `pii-read:${actorId}`, 100, 3600000);
    await tx.adminAuditLog.create({ data: { adminUserId: actorId, action: 'purchase_pii_read', target: 'purchase_request', targetId: id, changes: { fields: ['delivery', 'review', 'support', 'events'] } } });
  });
  const row = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!row) throw new PurchaseError(404, 'Purchase request not found.');
  return { request: await getPurchaseForOperator(id), delivery: decryptPii<DeliveryProfile>(row.encryptedDelivery, `request:${id}`), review: openReview(row.review, id) };
}

export async function updateOperatorPurchase(id: string, actorId: string, input: unknown) {
  const action = operatorActionSchema.parse(input);
  if (action.action === 'reconcile_payment') return reconcilePurchasePayment(id, actorId, action.version, action.draftId);
  await purchaseTransaction(async tx => {
    const row = await tx.purchaseRequest.findUnique({ where: { id } });
    if (!row) throw new PurchaseError(404, 'Purchase request not found.');
    if (row.version !== action.version) throw new PurchaseError(409, 'This request changed. Refresh before updating.');
    await consumeQuota(tx, `operator-write:${actorId}`, 200, 3600000);
    let data: Prisma.PurchaseRequestUpdateManyMutationInput;
    let message: string;
    if (action.action === 'recipient_review') {
      const review = openReview(row.review, id);
      if (!review || !['QUOTED', 'PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'ON_HOLD'].includes(row.status)) throw new PurchaseError(409, 'This stage cannot accept a recipient evidence update.');
      const delivery = reviewRecipient(row, action.evidence);
      data = { status: row.status, review: sealReview({ ...review, recipientEvidence: action.evidence, reviewedBy: actorId, reviewedAt: new Date().toISOString() }, id),
        encryptedDelivery: encryptPii(delivery, `request:${id}`) };
      message = 'Operator reviewed updated recipient documents or shipment authorization evidence.';
    } else if (action.action === 'revalidate') {
      if (row.status !== 'ON_HOLD' || !row.paidAt || !row.paymentOrderId || !row.quote) throw new PurchaseError(409, 'Only a provider-verified paid hold can be reviewed.');
      const fulfilled = await tx.purchaseEvent.findFirst({ where: { requestId: id, status: { in: ['PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'] } } });
      if (fulfilled) throw new PurchaseError(409, 'A fulfilment hold must resume its existing stage through support resolution.');
      const original = row.quote as unknown as PurchaseQuote;
      reviewRecipient(row, action.review.recipientEvidence);
      const reviewed = calculatePurchaseQuote(action.review, row.quantity, original.quoteVersion);
      const moneyFields = ['productCents', 'domesticShippingCents', 'serviceFeeCents', 'internationalShippingCents', 'insuranceCents', 'dutyCents', 'taxCents', 'totalCents'] as const;
      if (moneyFields.some(field => reviewed[field] !== original[field])) throw new PurchaseError(409, 'Paid amounts are immutable. A changed cost requires support and refund resolution.');
      data = { status: 'PAID', review: sealReview({ ...action.review, destination: row.destination, reviewedBy: actorId, reviewedAt: new Date().toISOString() }, id) };
      message = 'Held payment customs evidence reviewed; approved amounts preserved.';
    } else if (action.action === 'resume') {
      if (row.status !== 'ON_HOLD') throw new PurchaseError(409, 'Only a held request can be resumed.');
      const previous = await tx.purchaseEvent.findFirst({ where: { requestId: id, status: { not: 'ON_HOLD' } }, orderBy: { createdAt: 'desc' } });
      if (!previous || previous.status === 'PAYMENT_PENDING' || !row.paidAt || !['PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED'].includes(previous.status)) {
        throw new PurchaseError(409, 'The payment must be reconciled with the provider before this request can resume.');
      }
      data = { status: previous.status };
      message = `Operator resolved hold: ${action.reason}`;
    } else if (action.action === 'quote') {
      if (!['REVIEW_REQUIRED', 'QUOTED'].includes(row.status)) throw new PurchaseError(409, 'Quotes can only be changed before payment starts.');
      const quote = calculatePurchaseQuote(action.review, row.quantity, row.version + 1);
      reviewRecipient(row, action.review.recipientEvidence);
      data = { status: 'QUOTED', review: sealReview({ ...action.review, destination: row.destination, reviewedBy: actorId, reviewedAt: new Date().toISOString() }, id),
        quote: { ...quote }, quoteExpiresAt: new Date(Math.min(Date.now() + 86400000, Date.parse(action.review.rulesValidUntil), Date.parse(action.review.recipientEvidence.validUntil))) };
      message = 'Product, destination requirements and costs reviewed. A payment quote is available.';
    } else if (action.action === 'reject') {
      if (!['REVIEW_REQUIRED', 'QUOTED'].includes(row.status)) throw new PurchaseError(409, 'Paid or pending-payment requests require support review.');
      data = { status: 'REJECTED', quote: Prisma.DbNull, quoteExpiresAt: null };
      message = action.reason;
    } else {
      if (!TRANSITIONS[row.status as PurchaseStatus]?.includes(action.status)) throw new PurchaseError(409, 'This status transition is not allowed.');
      if (action.status === 'SHIPPED' && !(action.carrier && action.trackingNumber)) throw new PurchaseError(422, 'A carrier and tracking number are required.');
      const review = openReview(row.review, id);
      const rulesExpiry = review ? Date.parse(review.rulesValidUntil) : NaN;
      if (action.status === 'PURCHASING' && (!row.paidAt || !Number.isFinite(rulesExpiry) || rulesExpiry <= Date.now())) {
        throw new PurchaseError(409, 'Payment and current customs evidence are required before purchasing. Hold and review expired evidence.');
      }
      if (['PURCHASING', 'SHIPPED'].includes(action.status)) {
        if (!review) throw new PurchaseError(422, 'Reviewed recipient evidence is required.');
        reviewRecipient(row, review.recipientEvidence, action.status === 'SHIPPED' ? 'shipping' : 'purchasing', action.trackingNumber ?? row.trackingNumber ?? undefined);
      }
      data = { status: action.status, ...(action.carrier ? { carrier: action.carrier } : {}), ...(action.trackingNumber ? { trackingNumber: action.trackingNumber } : {}) };
      message = action.message;
    }
    const changed = await tx.purchaseRequest.updateMany({ where: { id, version: action.version }, data: { ...data, version: { increment: 1 } } });
    if (!changed.count) throw new PurchaseError(409, 'Another operator updated this request.');
    await tx.purchaseEvent.create({ data: { requestId: id, ...purchaseEventFields(id, actorId, 'operator', data.status as string, message) } });
    await tx.adminAuditLog.create({ data: { adminUserId: actorId, action: 'purchase_operator_update', target: 'purchase_request', targetId: id,
      changes: { action: action.action, status: data.status as string, version: action.version + 1 } } });
  });
  const row = await prisma.purchaseRequest.findUniqueOrThrow({ where: { id } });
  return purchaseDto(row, false);
}
