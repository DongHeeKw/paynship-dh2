import { NextResponse } from 'next/server';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import {
  getExchangeRateHistory,
  flagDriftedQuotes,
  DEFAULT_DRIFT_THRESHOLD_PERCENT,
} from '@/lib/calculator/exchange-rate-monitor';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const [history, driftedQuotes] = await Promise.all([
      getExchangeRateHistory(),
      flagDriftedQuotes(DEFAULT_DRIFT_THRESHOLD_PERCENT),
    ]);

    // Top 10 by absolute drift
    const topDrifted = driftedQuotes.slice(0, 10).map((q) => ({
      quoteId: q.quoteId,
      quotedRate: q.quotedRate,
      currentRate: q.currentRate,
      driftPercent: q.driftPercent,
      originalTotalUsd: q.originalTotalUsd,
      totalUsdImpact: q.totalUsdImpact,
    }));

    return NextResponse.json({
      currentRate: history.currentRate,
      previousRate: history.previousRate,
      rateSource: history.source,
      rateLastUpdated: history.cachedAt,
      driftThresholdPercent: DEFAULT_DRIFT_THRESHOLD_PERCENT,
      activeDriftedQuotesCount: driftedQuotes.length,
      topDriftedQuotes: topDrifted,
    });
  } catch (error) {
    console.error('Error fetching exchange rate status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate status' },
      { status: 500 },
    );
  }
}
