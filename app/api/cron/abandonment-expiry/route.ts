/**
 * Abandonment 48h expiry cron.
 *
 * Schedule: hourly (vercel.json 에서 등록 필요)
 *   - Hobby Plan 은 daily 만 가능 → 실제로는 daily 호출 + 운영자가 수시로 admin UI 에서 검토.
 *   - Pro Plan 으로 업그레이드 후 hourly 권장.
 *
 * 동작: AbandonmentLog 중 customerChoice=null + 48h 경과 → systemRecommendation 자동 적용.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processExpiredAbandonments } from '@/lib/abandonment/expiry';
import { sendOpsAlert } from '@/lib/ops/alerting';
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
  logger.info('AbandonmentExpiryCron', 'Starting expiry sweep');

  try {
    const result = await processExpiredAbandonments();
    const durationMs = Date.now() - startedAt;

    logger.info(
      'AbandonmentExpiryCron',
      `Done — processed=${result.processedCount} abandoned=${result.abandonedCount} returned=${result.returnedCount} errors=${result.errors.length} in ${durationMs}ms`,
    );

    if (result.errors.length > 0) {
      await sendOpsAlert(
        'warning',
        'cron_failure',
        `Abandonment expiry: ${result.errors.length} errors`,
        { errorCount: result.errors.length, processedCount: result.processedCount },
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      durationMs,
      ...result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('AbandonmentExpiryCron', `Failed: ${msg}`);
    await sendOpsAlert('critical', 'cron_failure', 'Abandonment cron failed', { error: msg }).catch(() => {});
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
