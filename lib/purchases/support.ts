import { supportSchema } from './schemas';
import { consumeQuota } from './quota';
import { purchaseTransaction } from './transaction';
import { PurchaseError } from './errors';
import { randomUUID } from 'node:crypto';
import { encryptPii } from './pii';

export async function createSupportTicket(requestId: string, userId: string, input: unknown) {
  const data = supportSchema.parse(input);
  const id = randomUUID();
  return purchaseTransaction(async tx => {
    const request = await tx.purchaseRequest.findFirst({ where: { id: requestId, userId } });
    if (!request) throw new PurchaseError(404, 'Purchase request not found.');
    if (await tx.purchaseSupportTicket.count({ where: { requestId, status: 'OPEN' } }) >= 3) throw new PurchaseError(429, 'There are already three open support requests for this purchase.');
    await consumeQuota(tx, `support:${userId}`, 10);
    return tx.purchaseSupportTicket.create({ data: { id, requestId,
      subject: encryptPii(data.subject, `support:${id}`), message: encryptPii(data.message, `support:${id}`) } });
  });
}
