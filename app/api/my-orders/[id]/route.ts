/**
 * PayNShip v2.1 — GET /api/my-orders/[id]
 *
 * 단일 ProcurementTask 상세.
 * Ownership 검증: metadata.customerEmail === user.email
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import { statusToStep, computeStepStates, isTerminated, NINE_STEPS } from '@/lib/procurement/nine-step';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const task = await prisma.procurementTask.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      metadata: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const meta = (task.metadata ?? {}) as any;
  if (meta.customerEmail !== user.email) {
    // 다른 사용자의 주문 접근 시도 → 404 (403 대신 정보 숨김)
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const step = statusToStep(task.status);
  const states = computeStepStates(step);
  const terminated = isTerminated(task.status);

  return NextResponse.json({
    id: task.id,
    status: task.status,
    currentStep: step,
    terminated: terminated.terminated,
    terminationKind: terminated.kind,
    steps: NINE_STEPS.map(s => ({
      ...s,
      state: states[s.step],
    })),
    order: {
      shopifyOrderId: meta.shopifyOrderId ?? null,
      shopifyOrderName: meta.shopifyOrderName ?? null,
      totalPrice: meta.totalPrice ?? null,
      currencyCode: meta.currencyCode ?? 'USD',
      shippingCountry: meta.shippingCountry ?? null,
      lineItemCount: meta.lineItemCount ?? 0,
      tags: meta.tags ?? null,
      receivedAt: meta.receivedAt ?? null,
    },
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
}
