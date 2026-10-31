import { NextResponse } from 'next/server';
import { z } from 'zod';
import { purchaseUser } from '@/lib/purchases/auth';
import { purchaseCheckout } from '@/lib/purchases/checkout';
import { purchaseApiError, readPurchaseBody } from '@/lib/purchases/api';
export const runtime = 'nodejs';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await purchaseUser(); const id = z.string().uuid().parse((await params).id); return NextResponse.json(await purchaseCheckout(id, user.id, user.email!, await readPurchaseBody(request))); }
  catch (error) { return purchaseApiError(error); }
}
