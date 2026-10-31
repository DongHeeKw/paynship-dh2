import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { purchaseTransaction } from './transaction';
import { consumeQuota } from './quota';
import { PurchaseError } from './errors';
import { createHostedPayment, paymentProviderConfig } from './payment-provider';
import { decryptPii } from './pii';
import type { DeliveryProfile } from './schemas';
import type { PurchaseQuote } from './quote';
import { requirePurchasingAvailable } from './availability';
import { purchaseEventFields } from './event-record';
import { openReview } from './review-storage';
import { reviewRecipient } from './recipient-review';

export async function purchaseCheckout(id: string, userId: string, email: string, input: unknown) {
  const { version } = z.object({ version: z.number().int().nonnegative() }).strict().parse(input);
  await requirePurchasingAvailable(true);
  paymentProviderConfig();
  const row = await purchaseTransaction(async tx => {
    const request = await tx.purchaseRequest.findFirst({ where: { id, userId } });
    if (!request) throw new PurchaseError(404, 'Purchase request not found.');
    const review = openReview(request.review, id);
    if (!review || Date.parse(review.rulesValidUntil) <= Date.now() || !Number.isFinite(Date.parse(review.rulesValidUntil))) {
      throw new PurchaseError(409, 'Current customs evidence is required before opening payment.');
    }
    reviewRecipient(request, review.recipientEvidence);
    if (request.status === 'PAYMENT_PENDING' && request.checkoutUrl) {
      if (!request.quoteExpiresAt || request.quoteExpiresAt.getTime() <= Date.now()) throw new PurchaseError(409, 'This payment quote expired. Contact support before paying.');
      return request;
    }
    if (request.status !== 'QUOTED' || request.version !== version || !request.review || !request.quote || !request.quoteExpiresAt || request.quoteExpiresAt.getTime() <= Date.now()) {
      throw new PurchaseError(409, 'A current, reviewed quote is required before payment.');
    }
    await consumeQuota(tx, `checkout:${userId}`, 10);
    const claim = await tx.purchaseRequest.updateMany({ where: { id, userId, version, status: 'QUOTED' }, data: { status: 'PAYMENT_PENDING', version: { increment: 1 } } });
    if (!claim.count) throw new PurchaseError(409, 'Payment creation is already in progress.');
    await tx.purchaseEvent.create({ data: { requestId: id, ...purchaseEventFields(id, userId, 'customer', 'PAYMENT_PENDING', 'Opening hosted payment for the approved quote.') } });
    return request;
  });
  if (row.checkoutUrl) return { checkoutUrl: row.checkoutUrl };
  try {
    const delivery = decryptPii<DeliveryProfile>(row.encryptedDelivery, `request:${id}`);
    const payment = await createHostedPayment(id, row.quote as unknown as PurchaseQuote, email, delivery);
    const changed = await prisma.purchaseRequest.updateMany({ where: { id, status: 'PAYMENT_PENDING' }, data: { paymentDraftId: payment.id, checkoutUrl: payment.checkoutUrl } });
    if (!changed.count) throw new PurchaseError(409, 'Payment needs reconciliation. Contact support.');
    return { checkoutUrl: payment.checkoutUrl };
  } catch (error) {
    // Never retry a possibly successful provider mutation automatically: a timeout
    // may have happened after the draft was created. Keep the request for reconciliation.
    await purchaseTransaction(async tx => {
      const changed = await tx.purchaseRequest.updateMany({ where: { id, status: 'PAYMENT_PENDING' }, data: { status: 'ON_HOLD', version: { increment: 1 } } });
      if (changed.count) await tx.purchaseEvent.create({ data: { requestId: id, ...purchaseEventFields(id, 'payment', 'system', 'ON_HOLD', 'Payment creation needs operator reconciliation before another attempt.') } });
    });
    if (error instanceof PurchaseError) throw error;
    throw new PurchaseError(503, 'Payment creation could not be confirmed. Contact support.');
  }
}
