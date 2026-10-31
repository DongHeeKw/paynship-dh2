import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { replySupportTicket } from '@/lib/purchases/operator-support';
import { purchaseApiError, readPurchaseBody } from '@/lib/purchases/api';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await requireAdminForApi({ minimumRole: 'operator' }); if (auth.error) return auth.error;
    const id = z.string().uuid().parse((await params).id); await replySupportTicket(id, auth.user!.id, await readPurchaseBody(request)); return NextResponse.json({ ok: true }); }
  catch (error) { return purchaseApiError(error); }
}
