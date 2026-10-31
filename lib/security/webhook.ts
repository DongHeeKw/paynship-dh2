import { createHmac, timingSafeEqual } from 'node:crypto';
import { PurchaseError } from '@/lib/purchases/errors';

export function verifyWebhookSignature(raw: Buffer, signature: string | null, secret: string) {
  if (!secret || !signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  const received = Buffer.from(signature, 'base64');
  return received.length === expected.length && timingSafeEqual(expected, received);
}

export async function readWebhookBytes(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new PurchaseError(400, 'Webhook body is missing.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 262144) throw new PurchaseError(413, 'Webhook body is too large.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}
