import { NextResponse } from 'next/server';
import { z } from 'zod';
import { purchaseUser } from '@/lib/purchases/auth';
import { cancelPurchase } from '@/lib/purchases/cancel';
import { purchaseApiError, readPurchaseBody } from '@/lib/purchases/api';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await purchaseUser(); const id = z.string().uuid().parse((await params).id); await cancelPurchase(id, user.id, await readPurchaseBody(request)); return NextResponse.json({ ok: true }); }
  catch (error) { return purchaseApiError(error); }
}
