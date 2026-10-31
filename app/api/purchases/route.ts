import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { purchaseUser } from '@/lib/purchases/auth';
import { createPurchase } from '@/lib/purchases/create';
import { listPurchasesForUser } from '@/lib/purchases/read';
import { purchaseApiError, readPurchaseBody } from '@/lib/purchases/api';
export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  try { const user = await purchaseUser(); const cursor = z.string().uuid().optional().parse(request.nextUrl.searchParams.get('cursor') ?? undefined); return NextResponse.json(await listPurchasesForUser(user.id, cursor)); }
  catch (error) { return purchaseApiError(error); }
}
export async function POST(request: Request) {
  try { const user = await purchaseUser(); return NextResponse.json({ request: await createPurchase(user.id, await readPurchaseBody(request)) }, { status: 201 }); }
  catch (error) { return purchaseApiError(error); }
}
