import { NextResponse } from 'next/server';
import { z } from 'zod';
import { purchaseUser } from '@/lib/purchases/auth';
import { createSupportTicket } from '@/lib/purchases/support';
import { getPurchaseForUser } from '@/lib/purchases/read';
import { purchaseApiError, readPurchaseBody } from '@/lib/purchases/api';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await purchaseUser(); const id = z.string().uuid().parse((await params).id); return NextResponse.json({ tickets: (await getPurchaseForUser(id, user.id)).tickets }); }
  catch (error) { return purchaseApiError(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await purchaseUser(); const id = z.string().uuid().parse((await params).id); const ticket = await createSupportTicket(id, user.id, await readPurchaseBody(request)); return NextResponse.json({ ticket: { id: ticket.id } }, { status: 201 }); }
  catch (error) { return purchaseApiError(error); }
}
