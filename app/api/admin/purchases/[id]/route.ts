import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { getOperatorPurchase, updateOperatorPurchase } from '@/lib/purchases/operator';
import { purchaseApiError, readPurchaseBody } from '@/lib/purchases/api';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await requireAdminForApi({ minimumRole: 'operator' }); if (auth.error) return auth.error;
    const id = z.string().uuid().parse((await params).id); return NextResponse.json(await getOperatorPurchase(id, auth.user!.id)); }
  catch (error) { return purchaseApiError(error); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const auth = await requireAdminForApi({ minimumRole: 'operator' }); if (auth.error) return auth.error;
    const id = z.string().uuid().parse((await params).id); return NextResponse.json({ request: await updateOperatorPurchase(id, auth.user!.id, await readPurchaseBody(request)) }); }
  catch (error) { return purchaseApiError(error); }
}
