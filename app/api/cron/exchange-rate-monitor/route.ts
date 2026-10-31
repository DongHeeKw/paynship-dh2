import { NextRequest, NextResponse } from 'next/server';
import {
  flagDriftedQuotes,
  requoteIfDrifted,
  AUTO_REQUOTE_THRESHOLD_PERCENT,
  DEFAULT_DRIFT_THRESHOLD_PERCENT,
} from '@/lib/calculator/exchange-rate-monitor';
import logger from '@/lib/utils/logger';
import { sendOpsAlert } from '@/lib/ops/alerting';

export const runtime = 'nodejs';

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret) {
    return false; // Default deny when CRON_SECRET is not set
  }

  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  logger.info('ExchangeRateMonitorCron', 'Starting exchange rate drift check');

  // Find all drifted quotes at the lower threshold (3%)
  const driftedQuotes = await flagDriftedQuotes(DEFAULT_DRIFT_THRESHOLD_PERCENT);

  const flagged: string[] = [];
  const requoted: Array<{ quoteId: string; oldTotalUsd: number; newTotalUsd: number }> = [];
  const errors: Array<{ quoteId: string; error: string }> = [];

  for (const dq of driftedQuotes) {
    if (Math.abs(dq.driftPercent) >= AUTO_REQUOTE_THRESHOLD_PERCENT) {
      // Auto-requote quotes with drift > 5%
      try {
        const result = await requoteIfDrifted(dq.quoteId, true);
        if (result) {
          requoted.push({
            quoteId: result.quoteId,
            oldTotalUsd: result.oldTotalUsd,
            newTotalUsd: result.newTotalUsd,
          });
          logger.info(
            'ExchangeRateMonitorCron',
            `Auto-requoted ${dq.quoteId}: drift ${dq.driftPercent.toFixed(2)}%`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({ quoteId: dq.quoteId, error: msg });
        logger.error('ExchangeRateMonitorCron', `Failed to requote ${dq.quoteId}: ${msg}`);
      }
    } else {
      // Just flag/log quotes with drift between 3% and 5%
      flagged.push(dq.quoteId);
      logger.warn(
        'ExchangeRateMonitorCron',
        `Flagged quote ${dq.quoteId} with drift ${dq.driftPercent.toFixed(2)}% (rate: ${dq.quotedRate} → ${dq.currentRate})`,
      );
    }
  }

  const summary = {
    success: true,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
    totalDriftedQuotes: driftedQuotes.length,
    flaggedCount: flagged.length,
    requotedCount: requoted.length,
    errorCount: errors.length,
    flagged,
    requoted,
    errors,
  };

  logger.info('ExchangeRateMonitorCron', `Done — flagged: ${flagged.length}, requoted: ${requoted.length}, errors: ${errors.length}`);

  if (errors.length > 0) {
    await sendOpsAlert('critical', 'cron_failure', 'Exchange rate monitor cron had errors', {
      job: 'exchange-rate-monitor',
      errorCount: errors.length,
      flaggedCount: flagged.length,
      requotedCount: requoted.length,
    }).catch(() => {});
  } else if (driftedQuotes.length > 0) {
    await sendOpsAlert('warning', 'exchange_rate_drift', `Exchange rate drift detected: ${driftedQuotes.length} quotes affected`, {
      flaggedCount: flagged.length,
      requotedCount: requoted.length,
      totalDrifted: driftedQuotes.length,
    }).catch(() => {});
  }

  return NextResponse.json(summary);
}
