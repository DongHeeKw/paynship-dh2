import type { PurchaseRequest } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { STATUS_LABELS, type PurchaseStatus } from './status';
import { PurchaseError } from './errors';
import { decryptPii } from './pii';
import { purchaseEventMessage } from './event-record';

// Explicit projection: never serialize a database row to a customer response.
export function purchaseDto(row: PurchaseRequest, includeOptions = true) {
  return { id: row.id, sourceUrl: row.sourceUrl, category: row.category, quantity: row.quantity, options: includeOptions ? decryptPii<string>(row.options, `options:${row.id}`) : '',
    destination: row.destination, status: row.status, statusLabel: STATUS_LABELS[row.status as PurchaseStatus] ?? row.status,
    version: row.version, quote: row.quote, quoteExpiresAt: row.quoteExpiresAt,
    paymentReceived: Boolean(row.paidAt),
    checkoutAvailable: row.status === 'PAYMENT_PENDING' && Boolean(row.checkoutUrl),
    carrier: row.carrier, trackingNumber: row.trackingNumber, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

async function listWithScope(where: { userId: string } | Record<string, never>, cursor?: string) {
  if (cursor && 'userId' in where) {
    const ownedCursor = await prisma.purchaseRequest.findFirst({ where: { id: cursor, userId: where.userId }, select: { id: true } });
    if (!ownedCursor) throw new PurchaseError(404, 'The page cursor does not belong to your requests.');
  }
  const rows = await prisma.purchaseRequest.findMany({ where, take: 31,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  return { requests: rows.slice(0, 30).map(row => purchaseDto(row, false)), nextCursor: rows.length > 30 ? rows[29].id : null };
}

export function listPurchasesForUser(userId: string, cursor?: string) {
  if (!userId) throw new PurchaseError(401, 'Authentication required.');
  return listWithScope({ userId }, cursor);
}

export function listPurchasesForOperator(cursor?: string) { return listWithScope({}, cursor); }

async function readWithScope(where: { id: string; userId?: string }) {
  const row = await prisma.purchaseRequest.findFirst({ where,
    include: { events: { orderBy: { createdAt: 'desc' }, take: 100 }, supportTickets: { orderBy: { createdAt: 'desc' }, take: 20 } } });
  if (!row) throw new PurchaseError(404, 'Purchase request not found.');
  const fulfilmentStarted = Boolean(await prisma.purchaseEvent.findFirst({ where: { requestId: row.id, status: { in: ['PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'] } }, select: { id: true } }));
  return { ...purchaseDto(row), fulfilmentStarted, events: row.events.reverse().map(event => ({ status: event.status, message: purchaseEventMessage(row.id, event), source: event.source, createdAt: event.createdAt })),
    tickets: row.supportTickets.map(({ id, subject, message, reply, status, version, createdAt }) => ({ id, version,
      subject: decryptPii<string>(subject, `support:${id}`), message: decryptPii<string>(message, `support:${id}`),
      reply: reply ? decryptPii<string>(reply, `support:${id}`) : null, status, createdAt })) };
}

export function getPurchaseForUser(id: string, userId: string) {
  if (!userId) throw new PurchaseError(401, 'Authentication required.');
  return readWithScope({ id, userId });
}

export function getPurchaseForOperator(id: string) { return readWithScope({ id }); }
