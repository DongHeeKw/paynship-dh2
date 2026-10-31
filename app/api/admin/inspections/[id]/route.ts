/**
 * Admin Inspection 응답 처리 API.
 *
 * PATCH /api/admin/inspections/[id]
 *   body: { choice: 'SHIP_AS_IS' | 'EXCHANGE' | 'REFUND', resolution?: string }
 *
 * 운영자가 고객 응답을 대신 입력 (전화/이메일 응답 받은 경우) 또는
 * default 적용 전에 운영자 판단으로 강제 처리.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/helpers';

export const runtime = 'nodejs';

const VALID_CHOICES = ['SHIP_AS_IS', 'EXCHANGE', 'REFUND'] as const;
type Choice = (typeof VALID_CHOICES)[number];

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { isAdmin, user } = await requireAdmin('operator');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: { choice?: string; resolution?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.choice || !VALID_CHOICES.includes(body.choice as Choice)) {
    return NextResponse.json(
      { error: `choice must be one of: ${VALID_CHOICES.join(', ')}` },
      { status: 400 },
    );
  }

  const existing = await prisma.inspectionResponse.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
  }
  if (existing.respondedAt) {
    return NextResponse.json(
      { error: 'Already responded', existing },
      { status: 409 },
    );
  }

  const updated = await prisma.inspectionResponse.update({
    where: { id },
    data: {
      customerChoice: body.choice,
      respondedAt: new Date(),
      defaultApplied: false,
      resolution:
        body.resolution ??
        `Operator override by ${user?.email ?? user?.id ?? 'admin'}`,
    },
  });

  return NextResponse.json({ success: true, item: updated });
}
