import { NextResponse } from 'next/server';
import { readWebhookBytes, verifyWebhookSignature } from '@/lib/security/webhook';
import { applyPaymentEvent } from '@/lib/purchases/payment-event';
import { PurchaseError } from '@/lib/purchases/errors';
import { purchaseApiError } from '@/lib/purchases/api';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) throw new PurchaseError(503, 'Payment webhook is not configured.');
    if (request.headers.get('x-shopify-shop-domain') !== process.env.SHOPIFY_STORE_DOMAIN || request.headers.get('x-shopify-topic') !== 'orders/paid') throw new PurchaseError(401, 'Webhook source is not allowed.');
    const raw = await readWebhookBytes(request);
    if (!verifyWebhookSignature(raw, request.headers.get('x-shopify-hmac-sha256'), secret)) throw new PurchaseError(401, 'Invalid webhook signature.');
    await applyPaymentEvent(raw);
    return NextResponse.json({ ok: true });
  } catch (error) { return purchaseApiError(error); }
}
