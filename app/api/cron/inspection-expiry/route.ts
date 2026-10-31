/**
 * Inspection 72h expiry cron.
 *
 * 동작: InspectionResponse 중 customerChoice=null + responseDeadline 경과
 *       → defaultApplied=true, customerChoice='SHIP_AS_IS' 자동 적용.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processExpiredInspections } from '@/lib/inspection/expiry';
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
  logger.info('InspectionExpiryCron', 'Starting expiry sweep');

  try {
    const result = await processExpiredInspections();
    const durationMs = Date.now() - startedAt;

    logger.info(
      'InspectionExpiryCron',
      `Done — processed=${result.processedCount} defaultApplied=${result.defaultApplied} errors=${result.errors.length} in ${durationMs}ms`,
    );

    if (result.errors.length > 0) {
      await sendOpsAlert(
        'warning',
        'cron_failure',
        `Inspection expiry: ${result.errors.length} errors`,
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
    logger.error('InspectionExpiryCron', `Failed: ${msg}`);
    await sendOpsAlert('critical', 'cron_failure', 'Inspection cron failed', { error: msg }).catch(() => {});
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
