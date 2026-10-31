import { createHash, randomUUID } from 'node:crypto';
import { createPurchaseSchema } from './schemas';
import { readStoredDeliveryProfile } from '@/lib/customs/delivery';
import { validateProductUrl } from './product-url';
import { intakeDecision } from './categories';
import { decryptPii, encryptPii } from './pii';
import { consumeQuota } from './quota';
import { purchaseTransaction } from './transaction';
import { PurchaseError } from './errors';
import { purchaseDto } from './read';
import { requirePurchasingAvailable } from './availability';
import { purchaseEventFields } from './event-record';

export async function createPurchase(userId: string, input: unknown) {
  const data = createPurchaseSchema.parse(input);
  await requirePurchasingAvailable();
  const sourceUrl = validateProductUrl(data.sourceUrl);
  if (intakeDecision(data.category) === 'OUT_OF_SCOPE') throw new PurchaseError(422, 'This product category is outside our current shipping service.');
  const payloadHash = createHash('sha256').update(JSON.stringify({ ...data, sourceUrl })).digest('hex');
  const id = randomUUID();
  const row = await purchaseTransaction(async tx => {
    const existing = await tx.purchaseRequest.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: data.idempotencyKey } } });
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw new PurchaseError(409, 'This submission key was already used for a different request.');
      return existing;
    }
    const pending = await tx.purchaseRequest.count({ where: { userId, status: { notIn: ['DELIVERED', 'REJECTED', 'CANCELLED'] } } });
    if (pending >= 5) throw new PurchaseError(429, 'You can have up to five active purchase requests.');
    if (await tx.purchaseRequest.findFirst({ where: { userId, sourceUrl, status: { notIn: ['DELIVERED', 'REJECTED', 'CANCELLED'] } } })) {
      throw new PurchaseError(409, 'An active request already exists for this product.');
    }
    await consumeQuota(tx, `submit:${userId}`, 20);
    await consumeQuota(tx, 'submit:global', 1000);
    const profile = await tx.deliveryProfile.findUnique({ where: { userId } });
    if (!profile) throw new PurchaseError(422, 'Save your delivery details first.');
    const delivery = readStoredDeliveryProfile(decryptPii(profile.encryptedData, `profile:${userId}`));
    return tx.purchaseRequest.create({ data: {
      id, userId, sourceUrl, category: data.category, quantity: data.quantity, options: encryptPii(data.options, `options:${id}`),
      destination: delivery.country, encryptedDelivery: encryptPii(delivery, `request:${id}`),
      idempotencyKey: data.idempotencyKey, payloadHash,
      events: { create: purchaseEventFields(id, userId, 'customer', 'REVIEW_REQUIRED', 'Purchase request received. Product and destination requirements will be reviewed before payment.') },
    } });
  });
  return purchaseDto(row);
}
