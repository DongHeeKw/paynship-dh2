import { Prisma } from '@prisma/client';
import { PurchaseError } from './errors';

export async function consumeQuota(tx: Prisma.TransactionClient, key: string, limit: number, windowMs = 86400000) {
  const bucket = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await tx.$queryRaw<Array<{ count: number }>>`
    INSERT INTO purchase_quotas (key, bucket, count) VALUES (${key}, ${bucket}, 1)
    ON CONFLICT (key, bucket) DO UPDATE SET count = purchase_quotas.count + 1
    WHERE purchase_quotas.count < ${limit} RETURNING count
  `;
  if (!rows.length) throw new PurchaseError(429, 'Request limit reached. Please try again later.');
}
