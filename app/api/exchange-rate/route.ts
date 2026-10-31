/**
 * PayNShip — Public exchange rate API (v2.2)
 *
 * GET /api/exchange-rate
 * Returns: { base: "USD", rates: { JPY: 0.0067, EUR: 0.93, ... }, fetchedAt }
 *
 * Source: 신한은행 10am (primary) → KEXIM (fallback). 듀얼 저장된 USD cross-rate 사용.
 * 클라이언트 Currency Context가 초기 로드 + 1시간마다 refetch. Cache 60s.
 */

import { NextResponse } from 'next/server';
import { getLatestUsdRates, USD_BASE } from '@/lib/exchange-rate/service';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache (per Vercel Serverless instance)
let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function GET() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return NextResponse.json(cache.data, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    });
  }

  const rates = await getLatestUsdRates();

  // capturedAt: USD base 중 가장 최근 row
  const latestRow = await prisma.exchangeRate.findFirst({
    where: { baseCurrency: USD_BASE },
    orderBy: { capturedAt: 'desc' },
    select: { capturedAt: true, source: true },
  });

  const body = {
    base: USD_BASE,
    rates,
    fetchedAt: latestRow?.capturedAt?.toISOString() ?? null,
    source: latestRow?.source ?? null,
    currencyCount: Object.keys(rates).length,
  };

  cache = { data: body, expiresAt: now + CACHE_TTL_MS };

  return NextResponse.json(body, {
    headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
}
