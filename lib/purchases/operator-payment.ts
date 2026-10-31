import { prisma } from '@/lib/db/prisma';
import { purchaseTransaction } from './transaction';
import { consumeQuota } from './quota';
import { PurchaseError } from './errors';
import { verifyHostedPayment } from './payment-verification';
import type { PurchaseQuote } from './quote';
import { purchaseDto } from './read';
import { purchaseEventFields } from './event-record';

// Recovery reads provider evidence; operators cannot declare payment successful.
export async function reconcilePurchasePayment(id: string, actorId: string, version: number, draftId: string) {
  const row = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!row || row.version !== version || !['ON_HOLD', 'PAYMENT_PENDING'].includes(row.status) || !row.quote) {
    throw new PurchaseError(409, 'Refresh the held payment request before reconciling.');
  }
  if (row.paymentDraftId && row.paymentDraftId !== draftId) throw new PurchaseError(409, 'A different checkout is already assigned.');
  const fulfilled = await prisma.purchaseEvent.findFirst({ where: { requestId: id, status: { in: ['PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'] } } });
  if (fulfilled) throw new PurchaseError(409, 'Payment reconciliation cannot restart an existing fulfilment.');
  await purchaseTransaction(async tx => { await consumeQuota(tx, `payment-reconcile:${actorId}`, 20, 3600000); });
  const verified = await verifyHostedPayment(draftId, id, row.quote as unknown as PurchaseQuote);
  const expiry = row.quoteExpiresAt?.getTime() ?? 0;
  const status = verified.paidAt ? (verified.paidAt.getTime() < expiry ? 'PAID' : 'ON_HOLD') : 'PAYMENT_PENDING';
  if (!verified.paidAt && (!verified.checkoutUrl || expiry <= Date.now())) throw new PurchaseError(409, 'Unpaid or expired checkout requires provider cancellation and support resolution.');
  await purchaseTransaction(async tx => {
    const current = await tx.purchaseRequest.findUnique({ where: { id } });
    if (!current || current.version !== version || (current.paymentOrderId && current.paymentOrderId !== verified.orderId)) {
      throw new PurchaseError(409, 'Payment state changed. Refresh before reconciling.');
    }
    await tx.purchaseRequest.update({ where: { id }, data: { status, paymentDraftId: verified.draftId, checkoutUrl: verified.checkoutUrl,
      paymentOrderId: verified.orderId, paidAt: verified.paidAt, version: { increment: 1 } } });
    await tx.purchaseEvent.create({ data: { requestId: id, ...purchaseEventFields(id, actorId, 'payment_provider', status,
      status === 'ON_HOLD' ? 'Provider payment verified. Expired customs evidence requires review before purchasing.' : 'Payment checkout reconciled against provider evidence.') } });
    await tx.adminAuditLog.create({ data: { adminUserId: actorId, action: 'purchase_payment_reconciled', target: 'purchase_request', targetId: id, changes: { status, draftId } } });
  });
  const updated = await prisma.purchaseRequest.findUniqueOrThrow({ where: { id } });
  return purchaseDto(updated, false);
}
