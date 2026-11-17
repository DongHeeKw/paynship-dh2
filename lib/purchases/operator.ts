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
import { CUSTOMS_REVIEW_WINDOW_MS, requireCurrentCustomsReview } from './customs-gate';
import { getCountryCustomsPolicy } from '@/lib/customs/country-policy';

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
  if (action.action === 'status' && action.status !== 'SHIPPED' && (action.carrier !== undefined || action.trackingNumber !== undefined)) {
    throw new PurchaseError(422, 'Carrier and tracking assignments are only accepted when dispatching a shipment.');
  }
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
      const original = row.quote as unknown as PurchaseQuote;
      reviewRecipient(row, action.review.recipientEvidence);
      if (original.serviceFeePolicy && !['retailer-order-15pct-min10000krw-v1', 'retailer-order-15pct-no-minimum'].includes(original.serviceFeePolicy)) throw new PurchaseError(409, 'This historical fee policy requires a separate review.');
      const reviewed = calculatePurchaseQuote(action.review, row.quantity, original.quoteVersion, Date.now(), original.serviceFeePolicy ? 'PAID' : 'LEGACY');
      const moneyFields = ['productCents', 'domesticShippingCents', 'serviceFeeCents', 'internationalShippingCents', 'insuranceCents', 'dutyCents', 'taxCents', 'clearanceCents', 'totalCents'] as const;
      if (moneyFields.some(field => (reviewed[field] ?? 0) !== (original[field] ?? 0))) throw new PurchaseError(409, 'Paid amounts are immutable. A changed cost requires support and refund resolution.');
      data = { status: fulfilled ? 'ON_HOLD' : 'PAID', review: sealReview({ ...action.review, destination: row.destination, reviewedBy: actorId, reviewedAt: new Date().toISOString() }, id) };
      message = fulfilled ? 'Held fulfilment customs evidence reviewed; paid amounts and existing fulfilment stage preserved. Resolve the hold before resuming.'
        : 'Held payment customs evidence reviewed; approved amounts preserved.';
    } else if (action.action === 'resume') {
      if (row.status !== 'ON_HOLD') throw new PurchaseError(409, 'Only a held request can be resumed.');
      const previous = await tx.purchaseEvent.findFirst({ where: { requestId: id, status: { not: 'ON_HOLD' } }, orderBy: { createdAt: 'desc' } });
      if (!previous || previous.status === 'PAYMENT_PENDING' || !row.paidAt || !['PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED'].includes(previous.status)) {
        throw new PurchaseError(409, 'The payment must be reconciled with the provider before this request can resume.');
      }
      const review = requireCurrentCustomsReview(openReview(row.review, id), row.destination);
      if (previous.status === 'SHIPPED') {
        if (!row.carrier || !row.trackingNumber) throw new PurchaseError(422, 'The original carrier and tracking assignment are required to resume this shipment.');
        reviewRecipient(row, review.recipientEvidence, 'shipping', row.trackingNumber);
      } else reviewRecipient(row, review.recipientEvidence, 'purchasing');
      data = { status: previous.status };
      message = `Operator resolved hold: ${action.reason}`;
    } else if (action.action === 'quote') {
      if (!['REVIEW_REQUIRED', 'QUOTED'].includes(row.status)) throw new PurchaseError(409, 'Quotes can only be changed before payment starts.');
      if (['US', 'CN', 'JP'].includes(row.destination) && !action.review.verifiedImportCharges) throw new PurchaseError(422, 'USA, China and Japan quotes require verified duty, tax and clearance amounts from current destination-specific evidence. A generic percentage calculation is insufficient.');
      const quote = calculatePurchaseQuote(action.review, row.quantity, row.version + 1);
      reviewRecipient(row, action.review.recipientEvidence);
      const policyDeadline = getCountryCustomsPolicy(row.destination).reviewDueAt;
      const quoteExpiry = Math.min(Date.now() + 86400000, Date.parse(action.review.rulesValidUntil),
        Date.parse(action.review.rulesVerifiedAt) + CUSTOMS_REVIEW_WINDOW_MS,
        Date.parse(action.review.recipientEvidence.validUntil), Date.parse(action.review.recipientEvidence.verifiedAt) + CUSTOMS_REVIEW_WINDOW_MS,
        policyDeadline ? Date.parse(policyDeadline) : Infinity);
      if (!Number.isFinite(quoteExpiry) || quoteExpiry <= Date.now()) throw new PurchaseError(422, 'Refresh customs and recipient evidence before issuing a payable quote.');
      data = { status: 'QUOTED', review: sealReview({ ...action.review, serviceFeeCents: quote.serviceFeeCents, destination: row.destination, reviewedBy: actorId, reviewedAt: new Date().toISOString() }, id),
        quote: { ...quote }, quoteExpiresAt: new Date(quoteExpiry) };
      message = 'Product, destination requirements and costs reviewed. A payment quote is available.';
    } else if (action.action === 'reject') {
      if (!['REVIEW_REQUIRED', 'QUOTED'].includes(row.status)) throw new PurchaseError(409, 'Paid or pending-payment requests require support review.');
      data = { status: 'REJECTED', quote: Prisma.DbNull, quoteExpiresAt: null };
      message = action.reason;
    } else {
      if (!TRANSITIONS[row.status as PurchaseStatus]?.includes(action.status)) throw new PurchaseError(409, 'This status transition is not allowed.');
      if (action.status === 'SHIPPED' && !(action.carrier && action.trackingNumber)) throw new PurchaseError(422, 'A carrier and tracking number are required.');
      const review = openReview(row.review, id);
      if (['PURCHASING', 'SHIPPED'].includes(action.status)) {
        if (!row.paidAt) throw new PurchaseError(409, 'Verified payment is required before purchasing or dispatch.');
        const currentReview = requireCurrentCustomsReview(review, row.destination);
        reviewRecipient(row, currentReview.recipientEvidence, action.status === 'SHIPPED' ? 'shipping' : 'purchasing', action.trackingNumber ?? row.trackingNumber ?? undefined);
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
