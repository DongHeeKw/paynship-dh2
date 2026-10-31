import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { listSupportTickets } from '@/lib/purchases/operator-support';
import { purchaseApiError } from '@/lib/purchases/api';
export async function GET(request: NextRequest) {
  try { const auth = await requireAdminForApi({ minimumRole: 'operator' }); if (auth.error) return auth.error;
    const cursor = z.string().uuid().optional().parse(request.nextUrl.searchParams.get('cursor') ?? undefined); return NextResponse.json(await listSupportTickets(auth.user!.id, cursor)); }
  catch (error) { return purchaseApiError(error); }
}
