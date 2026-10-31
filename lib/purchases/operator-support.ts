import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { PurchaseError } from './errors';
import { decryptPii, encryptPii } from './pii';
import { purchaseTransaction } from './transaction';
import { consumeQuota } from './quota';

export async function listSupportTickets(actorId: string, cursor?: string) {
  await purchaseTransaction(async tx => {
    await consumeQuota(tx, `pii-read:${actorId}`, 100, 3600000);
    await tx.adminAuditLog.create({ data: { adminUserId: actorId, action: 'purchase_support_read', target: 'purchase_support', changes: { fields: ['subject', 'message', 'reply'] } } });
  });
  const rows = await prisma.purchaseSupportTicket.findMany({ take: 31, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, requestId: true, subject: true, message: true, reply: true, status: true, version: true, updatedAt: true } });
  return { tickets: rows.slice(0, 30).map(row => ({ ...row,
    subject: decryptPii<string>(row.subject, `support:${row.id}`), message: decryptPii<string>(row.message, `support:${row.id}`),
    reply: row.reply ? decryptPii<string>(row.reply, `support:${row.id}`) : null })), nextCursor: rows.length > 30 ? rows[29].id : null };
}

export async function replySupportTicket(id: string, actorId: string, input: unknown) {
  const data = z.object({ version: z.number().int().nonnegative(), reply: z.string().trim().min(5).max(2000), status: z.enum(['OPEN', 'RESOLVED']) }).strict().parse(input);
  await purchaseTransaction(async tx => {
    await consumeQuota(tx, `support-reply:${actorId}`, 100);
    const changed = await tx.purchaseSupportTicket.updateMany({ where: { id, version: data.version }, data: { reply: encryptPii(data.reply, `support:${id}`), status: data.status, updatedBy: actorId, version: { increment: 1 } } });
    if (!changed.count) throw new PurchaseError(409, 'The support ticket changed. Refresh before replying.');
    await tx.adminAuditLog.create({ data: { adminUserId: actorId, action: 'purchase_support_reply', target: 'purchase_support', targetId: id, changes: { status: data.status } } });
  });
}
