import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi } from '@/lib/api/auth-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public liveness must not turn anonymous probes into database/provider calls.
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('deep') !== 'true') {
    return NextResponse.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const auth = await requireAdminForApi({ minimumRole: 'operator' });
  if (auth.error) return auth.error;
  let database = false;
  try { await prisma.$queryRaw`SELECT 1`; database = true; } catch { /* no diagnostic secrets */ }
  return NextResponse.json({ status: database ? 'ok' : 'degraded', checks: { database } },
    { status: database ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
