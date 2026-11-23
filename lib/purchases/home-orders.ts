import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { PurchaseError } from './errors';
import { STATUS_LABELS, type PurchaseStatus } from './status';
import type { HomeOrder, HomeOrders } from './home-types';

const attention = ['ON_HOLD', 'QUOTED', 'PAYMENT_PENDING'];
const progressing = ['REVIEW_REQUIRED', 'PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED'];
const select = {
  id: true, category: true, destination: true, quantity: true, status: true, updatedAt: true, quoteExpiresAt: true,
  events: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
} satisfies Prisma.PurchaseRequestSelect;
type HomeRow = Prisma.PurchaseRequestGetPayload<{ select: typeof select }>;
function summary(row: HomeRow, nowMs: number): HomeOrder {
  let action = 'View progress';
  if (row.status === 'ON_HOLD') action = 'Check what needs attention';
  if (row.status === 'QUOTED' || row.status === 'PAYMENT_PENDING') {
    action = row.quoteExpiresAt && row.quoteExpiresAt.getTime() > nowMs ? 'Review your quote' : 'Check quote validity';
  }
  return { id: row.id, category: row.category, destination: row.destination, quantity: row.quantity,
    status: row.status, statusLabel: STATUS_LABELS[row.status as PurchaseStatus] ?? 'Needs review',
    action, needsAttention: attention.includes(row.status), updatedAt: row.updatedAt.toISOString(),
    lastEventAt: row.events[0]?.createdAt.toISOString() ?? null };
}

/** Existing authenticated purchase API only. Never accept an owner from query/body. */
export async function getHomeOrdersForUser(userId: string, nowIso = new Date().toISOString()): Promise<HomeOrders> {
  if (!userId) throw new PurchaseError(401, 'Authentication required.');
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) throw new PurchaseError(400, 'Invalid summary time.');
  const list = (statuses: string[]) => prisma.purchaseRequest.findMany({
    where: { userId, status: { in: statuses } }, select, take: 3,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
  const [needsAttention, inProgress, activeCount, attentionCount] = await Promise.all([
    list(attention), list(progressing),
    prisma.purchaseRequest.count({ where: { userId, status: { in: [...attention, ...progressing] } } }),
    prisma.purchaseRequest.count({ where: { userId, status: { in: attention } } }),
  ]);
  return { activeCount, attentionCount, orders: [...needsAttention, ...inProgress].slice(0, 3).map((row) => summary(row, now)) };
}
