import { NextResponse } from 'next/server';
import { readWebhookBytes, verifyWebhookSignature } from '@/lib/security/webhook';
import { applyShipmentEvent } from '@/lib/purchases/shipment-event';
import { PurchaseError } from '@/lib/purchases/errors';
import { purchaseApiError } from '@/lib/purchases/api';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const secret = process.env.SHIPPING_WEBHOOK_SECRET;
    if (!secret) throw new PurchaseError(503, 'Carrier gateway is not configured.');
    const raw = await readWebhookBytes(request);
    if (!verifyWebhookSignature(raw, request.headers.get('x-paynship-signature'), secret)) throw new PurchaseError(401, 'Invalid webhook signature.');
    let payload: unknown;
    try { payload = JSON.parse(raw.toString('utf8')); } catch { throw new PurchaseError(400, 'Invalid webhook JSON.'); }
    await applyShipmentEvent(payload);
    return NextResponse.json({ ok: true });
  } catch (error) { return purchaseApiError(error); }
}
