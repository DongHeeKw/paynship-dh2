import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { PurchaseError } from './errors';

export async function readPurchaseBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new PurchaseError(400, 'Request body is missing.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) throw new PurchaseError(413, 'Request body is too large.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new PurchaseError(400, 'Invalid JSON.'); }
}

export function purchaseApiError(error: unknown) {
  if (error instanceof PurchaseError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: 'Check the form fields.', fields: error.flatten().fieldErrors }, { status: 400 });
  // Never return ORM errors, addresses, customs identifiers, credentials or stack traces.
  return NextResponse.json({ error: 'The service is temporarily unavailable. Please try again later.' }, { status: 503 });
}
