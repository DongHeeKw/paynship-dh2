import { z } from 'zod';
import { consumeQuota } from './quota';
import { purchaseTransaction } from './transaction';
import { PurchaseError } from './errors';
import { purchaseEventFields } from './event-record';

export async function cancelPurchase(id: string, userId: string, input: unknown) {
  const { version } = z.object({ version: z.number().int().nonnegative() }).strict().parse(input);
  await purchaseTransaction(async tx => {
    const row = await tx.purchaseRequest.findFirst({ where: { id, userId } });
    if (!row) throw new PurchaseError(404, 'Purchase request not found.');
    if (row.status === 'CANCELLED') return;
    if (!['REVIEW_REQUIRED', 'QUOTED'].includes(row.status)) throw new PurchaseError(409, 'Payment or fulfilment has started. Contact support to request cancellation.');
    await consumeQuota(tx, `cancel:${userId}`, 5);
    const changed = await tx.purchaseRequest.updateMany({ where: { id, userId, version }, data: { status: 'CANCELLED', version: { increment: 1 } } });
    if (!changed.count) throw new PurchaseError(409, 'This request has changed. Refresh before cancelling.');
    await tx.purchaseEvent.create({ data: { requestId: id, ...purchaseEventFields(id, userId, 'customer', 'CANCELLED', 'Cancelled before payment.') } });
  });
}
