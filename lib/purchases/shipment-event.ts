import { z } from 'zod';
import { purchaseTransaction } from './transaction';
import { PurchaseError } from './errors';
import { createHash } from 'node:crypto';
import { purchaseEventFields } from './event-record';

export const shipmentEventSchema = z.object({
  eventId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), requestId: z.string().uuid(),
  carrier: z.string().trim().min(2).max(60), trackingNumber: z.string().trim().min(3).max(100),
  status: z.enum(['IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION']),
  occurredAt: z.string().datetime(), sentAt: z.string().datetime(),
}).strict();

// Contract for a carrier gateway. A provider-specific adapter must normalize and
// sign real events; this endpoint does not manufacture carrier activity.
export async function applyShipmentEvent(input: unknown) {
  const event = shipmentEventSchema.parse(input);
  const occurredAt = new Date(event.occurredAt);
  const now = Date.now();
  if (Math.abs(now - Date.parse(event.sentAt)) > 300000 || occurredAt.getTime() > now + 300000) throw new PurchaseError(400, 'Shipment event timestamp is invalid.');
  const receiptId = `carrier:${createHash('sha256').update(JSON.stringify([event.carrier, event.requestId, event.eventId])).digest('hex')}`;
  await purchaseTransaction(async tx => {
    if (await tx.purchaseWebhookReceipt.findUnique({ where: { id: receiptId } })) return;
    const row = await tx.purchaseRequest.findUnique({ where: { id: event.requestId } });
    if (!row?.paidAt || !row.carrier || !row.trackingNumber || row.carrier !== event.carrier || row.trackingNumber !== event.trackingNumber) throw new PurchaseError(409, 'Shipment did not match an assigned carrier and tracking number.');
    if (!['SHIPPED', 'ON_HOLD', 'DELIVERED'].includes(row.status)) throw new PurchaseError(409, 'This request has not shipped.');
    if (occurredAt < row.createdAt) throw new PurchaseError(400, 'Shipment event predates the purchase request.');
    if (!row.lastCarrierEventAt || occurredAt > row.lastCarrierEventAt) {
      let status = row.status;
      if (row.status !== 'DELIVERED') {
        if (event.status === 'EXCEPTION') status = 'ON_HOLD';
        if (event.status === 'DELIVERED') status = 'DELIVERED';
      }
      await tx.purchaseRequest.update({ where: { id: row.id }, data: { status, lastCarrierEventAt: occurredAt, version: { increment: 1 } } });
      await tx.purchaseEvent.create({ data: { requestId: row.id, ...purchaseEventFields(row.id, 'carrier', 'carrier_gateway', status,
        `${event.carrier}: ${event.status.toLowerCase().replaceAll('_', ' ')} (${occurredAt.toISOString()}).`) } });
    }
    await tx.purchaseWebhookReceipt.create({ data: { id: receiptId, provider: 'carrier_gateway' } });
  });
}
