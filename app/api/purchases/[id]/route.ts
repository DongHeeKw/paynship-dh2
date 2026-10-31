import { NextResponse } from 'next/server';
import { z } from 'zod';
import { purchaseUser } from '@/lib/purchases/auth';
import { getPurchaseForUser } from '@/lib/purchases/read';
import { purchaseApiError } from '@/lib/purchases/api';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await purchaseUser(); const id = z.string().uuid().parse((await params).id); return NextResponse.json({ request: await getPurchaseForUser(id, user.id) }); }
  catch (error) { return purchaseApiError(error); }
}
