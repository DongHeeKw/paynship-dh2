import { z } from 'zod';
import { createHash } from 'node:crypto';
import { purchaseTransaction } from './transaction';
import type { PurchaseQuote } from './quote';
import { PurchaseError } from './errors';
import { prisma } from '@/lib/db/prisma';
import { verifyHostedPayment } from './payment-verification';
import { purchaseEventFields } from './event-record';

const paymentEventSchema = z.object({
  id: z.union([z.string().regex(/^\d{1,30}$/), z.number().int().positive().safe()]),
  financial_status: z.literal('paid'),
  total_price_set: z.object({ presentment_money: z.object({ currency_code: z.string().length(3), amount: z.string().regex(/^\d+\.\d{2}$/) }) }),
  note_attributes: z.array(z.object({ name: z.string(), value: z.string() })).max(50),
});

export async function applyPaymentEvent(raw: Buffer) {
  let json: unknown;
  try { json = JSON.parse(raw.toString('utf8')); } catch { throw new PurchaseError(400, 'Invalid webhook JSON.'); }
  const data = paymentEventSchema.parse(json);
  const requestId = data.note_attributes.find(item => item.name === 'purchase_request_id')?.value;
  if (!requestId) return; // Unrelated historical store order.
  z.string().uuid().parse(requestId);
  const quoteVersion = Number(data.note_attributes.find(item => item.name === 'purchase_quote_version')?.value);
  const receiptId = `shopify:${createHash('sha256').update(raw).digest('hex')}`;
  if (await prisma.purchaseWebhookReceipt.findUnique({ where: { id: receiptId } })) return;
  const stored = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
  if (!stored?.paymentDraftId || !stored.quote) throw new PurchaseError(409, 'The payment draft must be reconciled before accepting payment.');
  const verified = await verifyHostedPayment(stored.paymentDraftId, requestId, stored.quote as unknown as PurchaseQuote);
  if (verified.orderId !== String(data.id) || !verified.paidAt) throw new PurchaseError(409, 'This paid order did not originate from the stored checkout.');
  await purchaseTransaction(async tx => {
    if (await tx.purchaseWebhookReceipt.findUnique({ where: { id: receiptId } })) return;
    const request = await tx.purchaseRequest.findUnique({ where: { id: requestId } });
    if (!request?.quote) throw new PurchaseError(409, 'The payment quote could not be matched.');
    const quote = request.quote as unknown as PurchaseQuote;
    if (request.paymentDraftId !== verified.draftId || quote.quoteVersion !== (stored.quote as unknown as PurchaseQuote).quoteVersion) {
      throw new PurchaseError(409, 'Payment verification changed. Retry the signed event.');
    }
    const money = data.total_price_set.presentment_money;
    if (money.currency_code !== 'USD' || Math.round(Number(money.amount) * 100) !== quote.totalCents || quoteVersion !== quote.quoteVersion) {
      throw new PurchaseError(409, 'Payment amount, currency or quote version did not match.');
    }
    if (request.paymentOrderId && request.paymentOrderId !== String(data.id)) throw new PurchaseError(409, 'Another payment already belongs to this request.');
    if (!request.paidAt) {
      if (!['PAYMENT_PENDING', 'ON_HOLD'].includes(request.status)) throw new PurchaseError(409, 'This request is not awaiting payment.');
      const expired = !request.quoteExpiresAt || request.quoteExpiresAt.getTime() <= verified.paidAt!.getTime();
      const status = expired ? 'ON_HOLD' : 'PAID';
      await tx.purchaseRequest.update({ where: { id: requestId }, data: { status, paymentOrderId: String(data.id), paidAt: verified.paidAt, version: { increment: 1 } } });
      await tx.purchaseEvent.create({ data: { requestId, ...purchaseEventFields(requestId, 'shopify', 'payment_provider', status,
        expired ? 'Payment received after quote expiry. Operator review is required before purchasing.' : 'Payment confirmed by the payment provider.') } });
    }
    await tx.purchaseWebhookReceipt.create({ data: { id: receiptId, provider: 'shopify' } });
  });
}
