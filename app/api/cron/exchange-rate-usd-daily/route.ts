/**
 * PayNShip — Exchange rate daily cron (v2.2)
 *
 * Schedule: `0 1 * * *` (daily 01:00 UTC = 10:00 KST — 신한은행 고시 직후)
 * Behavior: Shinhan → KEXIM provider chain → Prisma 듀얼 저장 (KRW base + USD cross-rate).
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` 필수.
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshUsdRates } from '@/lib/exchange-rate/service';
import logger from '@/lib/utils/logger';

export const runtime = 'nodejs';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  logger.info('ExchangeRateDailyCron', 'Starting refresh (Shinhan → KEXIM chain)');

  try {
    const result = await refreshUsdRates();
    const durationMs = Date.now() - startedAt;

    logger.info(
      'ExchangeRateDailyCron',
      `Done — provider=${result.provider} saved=${result.saved} rows in ${durationMs}ms`,
    );

    return NextResponse.json({
      success: true,
      durationMs,
      provider: result.provider,
      fetchedAt: result.fetchedAt.toISOString(),
      saved: result.saved,
      sample: {
        USD_KRW: result.snapshot.rates.USD,
        JPY_KRW: result.snapshot.rates.JPY,
        EUR_KRW: result.snapshot.rates.EUR,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('ExchangeRateDailyCron', `Failed: ${msg}`);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
