/**
 * Exchange Rate Monitor
 *
 * Detects drift between quoted exchange rates and the current rate.
 * Used by the cron job to auto-requote drifted quotes and by the admin UI.
 */

import { prisma } from '@/lib/db/prisma';
import { getExchangeRate, getCachedRateInfo } from './exchange-rate';
import { calculatePrice } from './price';
import logger from '@/lib/utils/logger';

// ============================================================================
// Constants
// ============================================================================

/** Default threshold (%) at which a quote is considered drifted */
export const DEFAULT_DRIFT_THRESHOLD_PERCENT = 3;

/** Threshold (%) at which we auto-requote rather than just flag */
export const AUTO_REQUOTE_THRESHOLD_PERCENT = 5;

// ============================================================================
// Types
// ============================================================================

export interface DriftInfo {
  quotedRate: number;
  currentRate: number;
  driftPercent: number; // positive = current rate is higher than quoted (KRW weakened)
  isDrifted: boolean;
}

export interface DriftedQuote {
  quoteId: string;
  quotedRate: number;
  currentRate: number;
  driftPercent: number;
  totalUsdImpact: number; // how much the total USD amount would change
  originalTotalUsd: number;
}

export interface RequoteResult {
  quoteId: string;
  oldRate: number;
  newRate: number;
  driftPercent: number;
  oldTotalUsd: number;
  newTotalUsd: number;
  updatedAt: string;
}

export interface ExchangeRateHistory {
  currentRate: number;
  previousRate: number | null;
  source: string | null;
  cachedAt: string | null;
}

// ============================================================================
// Core drift check
// ============================================================================

/**
 * Compare a quoted rate against the current live rate.
 * driftPercent > 0 means current rate is higher than quoted (KRW weakened → customer overpays).
 * driftPercent < 0 means current rate is lower than quoted (KRW strengthened → PayNShip absorbs loss).
 */
export async function checkExchangeRateDrift(
  quotedRate: number,
  thresholdPercent: number = DEFAULT_DRIFT_THRESHOLD_PERCENT,
): Promise<DriftInfo> {
  const currentRate = await getExchangeRate();
  const driftPercent = ((currentRate - quotedRate) / quotedRate) * 100;

  return {
    quotedRate,
    currentRate,
    driftPercent: Math.round(driftPercent * 100) / 100,
    isDrifted: Math.abs(driftPercent) >= thresholdPercent,
  };
}

// ============================================================================
// Flag drifted quotes
// ============================================================================

/**
 * Find all active quotes (not yet converted to a paid order) where the
 * exchange rate drift exceeds the given threshold.
 *
 * "Active" = quote.validUntil is still in the future and no paid Order linked.
 */
export async function flagDriftedQuotes(
  thresholdPercent: number = DEFAULT_DRIFT_THRESHOLD_PERCENT,
): Promise<DriftedQuote[]> {
  const currentRate = await getExchangeRate();

  // Fetch active quotes — those not yet expired and with no paid order.
  const activeQuotes = await prisma.quote.findMany({
    where: {
      validUntil: { gt: new Date() },
      orders: {
        none: {
          status: {
            in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'],
          },
        },
      },
    },
    select: {
      id: true,
      exchangeRate: true,
      totalUsd: true,
      productPriceUsd: true,
    },
  });

  const drifted: DriftedQuote[] = [];

  for (const quote of activeQuotes) {
    const driftPercent =
      ((currentRate - quote.exchangeRate) / quote.exchangeRate) * 100;

    if (Math.abs(driftPercent) >= thresholdPercent) {
      // Estimate USD impact: the item price in KRW recalculated at the new rate
      // changes the base. We approximate impact as the difference applied to
      // the product price portion only (shipping/fees are USD-denominated).
      const rateRatio = quote.exchangeRate / currentRate;
      const newProductPriceUsd = quote.productPriceUsd * rateRatio;
      const totalUsdImpact =
        Math.round((newProductPriceUsd - quote.productPriceUsd) * 100) / 100;

      drifted.push({
        quoteId: quote.id,
        quotedRate: quote.exchangeRate,
        currentRate,
        driftPercent: Math.round(driftPercent * 100) / 100,
        originalTotalUsd: quote.totalUsd,
        totalUsdImpact,
      });
    }
  }

  // Sort by absolute drift descending
  drifted.sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent));

  return drifted;
}

// ============================================================================
// Exchange rate history
// ============================================================================

/**
 * Return the current rate plus the previously cached rate for trend display.
 * The "previous" rate is retrieved from the cache info before refreshing.
 */
export async function getExchangeRateHistory(): Promise<ExchangeRateHistory> {
  // Capture whatever is in the cache before the refresh
  const previousInfo = getCachedRateInfo();

  const currentRate = await getExchangeRate();

  return {
    currentRate,
    previousRate: previousInfo ? previousInfo.rate : null,
    source: previousInfo ? previousInfo.source : null,
    cachedAt: previousInfo ? previousInfo.timestamp.toISOString() : null,
  };
}

// ============================================================================
// Auto-requote
// ============================================================================

/**
 * Recalculate a quote's USD amounts using the current exchange rate.
 * Updates the DB record when drift exceeds the threshold (or forceRequote=true).
 *
 * The quote record stores the final USD breakdown; we reconstruct inputs from
 * the productSnapshot / cartSnapshot stored in the quote to call calculatePrice.
 */
export async function requoteIfDrifted(
  quoteId: string,
  forceRequote = false,
  thresholdPercent: number = DEFAULT_DRIFT_THRESHOLD_PERCENT,
): Promise<RequoteResult | null> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: {
      id: true,
      exchangeRate: true,
      totalUsd: true,
      productPriceUsd: true,
      serviceFee: true,
      domesticShippingUsd: true,
      internationalShipping: true,
      customsDuty: true,
      vat: true,
      destinationCountry: true,
      productSnapshot: true,
      validUntil: true,
    },
  });

  if (!quote) {
    logger.warn('ExchangeRateMonitor', `Quote ${quoteId} not found`);
    return null;
  }

  // Don't requote expired quotes
  if (quote.validUntil < new Date()) {
    logger.debug('ExchangeRateMonitor', `Quote ${quoteId} is expired, skipping`);
    return null;
  }

  const currentRate = await getExchangeRate();
  const driftPercent =
    ((currentRate - quote.exchangeRate) / quote.exchangeRate) * 100;

  if (!forceRequote && Math.abs(driftPercent) < thresholdPercent) {
    return null;
  }

  // Extract product info from snapshot to recalculate
  const snapshot = quote.productSnapshot as Record<string, unknown> | null;

  let newBreakdown;
  try {
    newBreakdown = await calculatePrice({
      itemPriceKRW: snapshot?.priceKrw as number ?? quote.productPriceUsd * quote.exchangeRate,
      countryCode: quote.destinationCountry,
      weightKg: snapshot?.weightKg as number | undefined,
      category: snapshot?.category as string | undefined,
    });
  } catch (error) {
    logger.error(
      'ExchangeRateMonitor',
      `Failed to recalculate quote ${quoteId}: ${error}`,
    );
    return null;
  }

  // Update the quote in DB
  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      exchangeRate: newBreakdown.exchangeRate,
      productPriceUsd: newBreakdown.itemPriceUSD,
      serviceFee: newBreakdown.serviceFee,
      internationalShipping: newBreakdown.shippingCost,
      customsDuty: newBreakdown.customsDuty,
      vat: newBreakdown.salesTax,
      totalUsd: newBreakdown.totalUSD,
    },
  });

  logger.info(
    'ExchangeRateMonitor',
    `Requoted ${quoteId}: $${quote.totalUsd} → $${newBreakdown.totalUSD} (rate ${quote.exchangeRate} → ${newBreakdown.exchangeRate})`,
  );

  return {
    quoteId,
    oldRate: quote.exchangeRate,
    newRate: newBreakdown.exchangeRate,
    driftPercent: Math.round(driftPercent * 100) / 100,
    oldTotalUsd: quote.totalUsd,
    newTotalUsd: newBreakdown.totalUSD,
    updatedAt: new Date().toISOString(),
  };
}
