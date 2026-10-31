/**
 * PayNShip v2.1 — GET /api/my-orders
 *
 * 현재 사용자의 ProcurementTask 목록 반환.
 * Ownership 검증: metadata.customerEmail === user.email
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { statusToStep, getCurrentStepSummary, isTerminated } from '@/lib/procurement/nine-step';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ProcurementTask metadata JSON에서 customerEmail 매칭
  const tasks = await prisma.procurementTask.findMany({
    where: {
      metadata: {
        path: ['customerEmail'],
        equals: user.email,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      metadata: true,
    },
  });

  const items = tasks.map(t => {
    const meta = (t.metadata ?? {}) as any;
    const step = statusToStep(t.status);
    const terminated = isTerminated(t.status);
    return {
      id: t.id,
      shopifyOrderName: meta.shopifyOrderName ?? null,
      shopifyOrderId: meta.shopifyOrderId ?? null,
      status: t.status,
      currentStep: step,
      statusSummary: getCurrentStepSummary(t.status, 'ko'),
      terminated: terminated.terminated,
      terminationKind: terminated.kind,
      totalPrice: meta.totalPrice ?? null,
      currencyCode: meta.currencyCode ?? 'USD',
      lineItemCount: meta.lineItemCount ?? 0,
      shippingCountry: meta.shippingCountry ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ items, count: items.length });
}
