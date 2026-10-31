import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { listPurchasesForOperator } from '@/lib/purchases/read';
import { purchaseApiError } from '@/lib/purchases/api';
export async function GET(request: NextRequest) {
  try { const auth = await requireAdminForApi(); if (auth.error) return auth.error;
    const cursor = z.string().uuid().optional().parse(request.nextUrl.searchParams.get('cursor') ?? undefined);
    return NextResponse.json(await listPurchasesForOperator(cursor)); }
  catch (error) { return purchaseApiError(error); }
}
