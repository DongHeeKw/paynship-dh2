/**
 * Admin Inspection 큐 API.
 *
 * GET /api/admin/inspections
 *   ?status=PENDING (default) | RESPONDED | EXPIRED | ALL
 *   ?limit=50 (default)
 *
 * 운영자 (warehouse 검수자) 가 72h 응답 대기 항목을 모니터링하는 페이지용.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUS = ['PENDING', 'RESPONDED', 'EXPIRED', 'ALL'] as const;
type StatusFilter = (typeof VALID_STATUS)[number];

export async function GET(req: NextRequest) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const statusParam = (url.searchParams.get('status') ?? 'PENDING').toUpperCase();
  const status: StatusFilter = VALID_STATUS.includes(statusParam as StatusFilter)
    ? (statusParam as StatusFilter)
    : 'PENDING';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const now = new Date();

  const where = (() => {
    switch (status) {
      case 'PENDING':
        return { respondedAt: null, responseDeadline: { gte: now } };
      case 'RESPONDED':
        return { respondedAt: { not: null } };
      case 'EXPIRED':
        return { respondedAt: null, responseDeadline: { lt: now } };
      case 'ALL':
      default:
        return {};
    }
  })();

  const rows = await prisma.inspectionResponse.findMany({
    where,
    orderBy: [{ respondedAt: 'asc' }, { responseDeadline: 'asc' }],
    take: limit,
  });

  const items = rows.map(r => ({
    id: r.id,
    orderId: r.orderId,
    sellerCode: r.sellerCode,
    findings: r.findings,
    notifiedAt: r.notifiedAt.toISOString(),
    responseDeadline: r.responseDeadline.toISOString(),
    hoursLeft: Math.round((r.responseDeadline.getTime() - now.getTime()) / 36e5),
    customerChoice: r.customerChoice,
    respondedAt: r.respondedAt?.toISOString() ?? null,
    defaultApplied: r.defaultApplied,
    resolution: r.resolution,
  }));

  return NextResponse.json({
    status,
    count: items.length,
    items,
  });
}
