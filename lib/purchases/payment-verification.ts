import { z } from 'zod';
import { paymentProviderConfig } from './payment-provider';
import type { PurchaseQuote } from './quote';
import { PurchaseError } from './errors';

const moneySchema = z.object({ amount: z.string().regex(/^\d+\.\d{1,2}$/), currencyCode: z.literal('USD') });
const orderSchema = z.object({
  id: z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/), fullyPaid: z.boolean(),
  displayFinancialStatus: z.string(), cancelledAt: z.string().nullable(),
  totalPriceSet: z.object({ presentmentMoney: moneySchema }),
  transactions: z.array(z.object({ status: z.string(), kind: z.string(), processedAt: z.string().nullable(), test: z.boolean() })).max(100),
});
const draftSchema = z.object({
  id: z.string(), invoiceUrl: z.string().url().nullable(),
  customAttributes: z.array(z.object({ key: z.string(), value: z.string() })).max(50),
  totalPriceSet: z.object({ presentmentMoney: moneySchema }), order: orderSchema.nullable(),
});

// Query the exact server-stored draft. Matching customer-supplied attributes alone
// never proves that an incoming payment belongs to our checkout.
export async function verifyHostedPayment(draftId: string, requestId: string, quote: PurchaseQuote) {
  if (!/^gid:\/\/shopify\/DraftOrder\/\d+$/.test(draftId)) throw new PurchaseError(409, 'A verified payment draft is required.');
  const { domain, token, version } = paymentProviderConfig();
  const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query: `query VerifyPurchasePayment($id: ID!) {
      draftOrder(id: $id) { id invoiceUrl customAttributes { key value }
        totalPriceSet { presentmentMoney { amount currencyCode } }
        order { id fullyPaid displayFinancialStatus cancelledAt totalPriceSet { presentmentMoney { amount currencyCode } }
          transactions(first: 100) { status kind processedAt test } }
      }
    }`, variables: { id: draftId } }),
  });
  if (!response.ok) throw new PurchaseError(503, 'Payment provider verification is unavailable.');
  const payload = await response.json();
  const parsed = draftSchema.safeParse(payload.data?.draftOrder);
  if (payload.errors?.length || !parsed.success) throw new PurchaseError(503, 'Payment provider did not supply verifiable payment evidence.');
  const draft = parsed.data;
  const attributes = new Map(draft.customAttributes.map(item => [item.key, item.value]));
  if (draft.id !== draftId || attributes.get('purchase_request_id') !== requestId || attributes.get('purchase_quote_version') !== String(quote.quoteVersion)
    || Math.round(Number(draft.totalPriceSet.presentmentMoney.amount) * 100) !== quote.totalCents) {
    throw new PurchaseError(409, 'The payment draft did not match the approved purchase.');
  }
  if (draft.order && (!draft.order.fullyPaid || draft.order.displayFinancialStatus !== 'PAID' || draft.order.cancelledAt
    || Math.round(Number(draft.order.totalPriceSet.presentmentMoney.amount) * 100) !== quote.totalCents)) {
    throw new PurchaseError(409, 'The payment provider has not confirmed the approved total as paid.');
  }
  const timestamps = draft.order?.transactions.filter(item => item.status === 'SUCCESS' && ['SALE', 'CAPTURE'].includes(item.kind) && item.processedAt && (process.env.NODE_ENV !== 'production' || !item.test))
    .map(item => Date.parse(item.processedAt!)).filter(value => Number.isFinite(value) && value <= Date.now() + 300000) ?? [];
  if (draft.order && !timestamps.length) throw new PurchaseError(409, 'A successful payment transaction must be reconciled with the provider.');
  const url = draft.invoiceUrl ? new URL(draft.invoiceUrl) : null;
  if (url && (url.protocol !== 'https:' || ![domain, 'checkout.shopify.com'].includes(url.hostname))) throw new PurchaseError(503, 'Unexpected hosted payment address.');
  return { draftId, checkoutUrl: url?.toString() ?? null, orderId: draft.order?.id.split('/').pop() ?? null,
    paidAt: timestamps.length ? new Date(Math.max(...timestamps)) : null };
}
