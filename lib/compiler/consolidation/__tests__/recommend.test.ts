import { describe, expect, it } from 'vitest';
import { recommendConsolidation, type ConsolidationPlan } from '../recommend';

const NOW = '2026-11-22T12:00:00.000Z';
const EXPIRY = '2026-11-29T12:00:00.000Z';

function plan(overrides: Partial<ConsolidationPlan> = {}): ConsolidationPlan {
  return {
    id: 'separate',
    kind: 'SEPARATE',
    recipientKey: 'customer-A:address-1',
    manifestFingerprint: 'skuA:1,skuB:1',
    customerTotalKrw: 54_000,
    costComponentsVerified: true,
    customsVerified: true,
    carrierRateVerified: true,
    carrierRateExpiresAt: EXPIRY,
    legallyEligible: true,
    packageCompatible: true,
    meetsPromisedDelivery: true,
    additionalWaitDays: 0,
    ddpVerified: true,
    ...overrides,
  };
}

function compare(plans: readonly ConsolidationPlan[], options: {
  recipientKey?: string; requireDdp?: boolean; nowIso?: string;
} = {}) {
  return recommendConsolidation({
    plans,
    baselineSeparatePlanId: 'separate',
    recipientKey: options.recipientKey ?? 'customer-A:address-1',
    requireDdp: options.requireDdp ?? true,
    nowIso: options.nowIso ?? NOW,
  });
}

describe('cross-border compiler: verified consolidation recommendations', () => {
  it('keeps the existing separate plan when cost and waiting are tied', () => {
    expect(compare([plan(), plan({ id: 'all', kind: 'ALL' })])).toMatchObject({
      recommendedPlanId: 'separate', customerConsentRequired: false,
    });
  });
  it('TC-CON-03 suggests 22000 KRW savings when verified one-box shipping wins', () => {
    expect(compare([plan(), plan({ id: 'all', kind: 'ALL', customerTotalKrw: 32_000 })]))
      .toMatchObject({
        status: 'RECOMMENDED',
        recommendedPlanId: 'all',
        estimatedCustomerSavingsKrw: 22_000,
        extraWaitDays: 0,
        customerConsentRequired: true,
      });
  });

  it('TC-CON-04 chooses separate shipping if a larger box costs more', () => {
    expect(compare([plan({ customerTotalKrw: 36_000 }), plan({
      id: 'all', kind: 'ALL', customerTotalKrw: 45_000,
    })])).toMatchObject({
      status: 'RECOMMENDED', recommendedPlanId: 'separate', estimatedCustomerSavingsKrw: 0,
    });
  });

  it('TC-CON-05 pairs 8000 KRW savings with a 3-day wait and asks consent', () => {
    const result = compare([plan({ customerTotalKrw: 34_000 }), plan({
      id: 'wait', kind: 'WAIT', customerTotalKrw: 26_000, additionalWaitDays: 3,
    })]);
    expect(result).toMatchObject({
      status: 'RECOMMENDED',
      recommendedKind: 'WAIT',
      estimatedCustomerSavingsKrw: 8_000,
      extraWaitDays: 3,
      customerConsentRequired: true,
    });
  });

  it('TC-CON-07 considers a verified partial consolidation', () => {
    expect(compare([
      plan({ customerTotalKrw: 40_000 }),
      plan({ id: 'partial', kind: 'PARTIAL', customerTotalKrw: 33_000 }),
      plan({ id: 'all', kind: 'ALL', customerTotalKrw: 30_000, meetsPromisedDelivery: false }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'partial' });
  });

  it('TC-CON-02 never merges a different recipient into our plan', () => {
    expect(compare([
      plan(),
      plan({ id: 'all', kind: 'ALL', recipientKey: 'customer-B:address-2', customerTotalKrw: 10_000 }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'separate' });
  });

  it('TC-CON-08 rejects incompatible or legally ineligible parcels', () => {
    expect(compare([
      plan(),
      plan({ id: 'all', kind: 'ALL', customerTotalKrw: 1_000, packageCompatible: false }),
      plan({ id: 'partial', kind: 'PARTIAL', customerTotalKrw: 2_000, legallyEligible: false }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'separate' });
  });

  it('TC-CON-10 rejects expired carrier prices and unverifiable costs', () => {
    expect(compare([
      plan(),
      plan({ id: 'all', kind: 'ALL', customerTotalKrw: 1_000, carrierRateExpiresAt: NOW }),
      plan({ id: 'wait', kind: 'WAIT', customerTotalKrw: 1_000, costComponentsVerified: false }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'separate' });
  });

  it('TC-CON-12 does not promise DDP without verified eligibility', () => {
    expect(compare([
      plan(),
      plan({ id: 'all', kind: 'ALL', customerTotalKrw: 1_000, ddpVerified: false }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'separate' });
  });

  it('refuses to advertise savings if baseline is unknown or unverified', () => {
    expect(compare([plan({ customerTotalKrw: null }), plan({
      id: 'all', kind: 'ALL', customerTotalKrw: 1_000,
    })])).toEqual({ status: 'REVIEW_REQUIRED', reasons: ['BASELINE_NOT_VERIFIED'] });
  });

  it('preserves explicit evidence for a genuinely zero-priced component total', () => {
    expect(compare([plan({ customerTotalKrw: 0 })])).toMatchObject({
      status: 'RECOMMENDED', recommendedPlanId: 'separate', estimatedCustomerSavingsKrw: 0,
    });
  });

  it('rejects unsafe/non-integer financial amounts instead of rounding silently', () => {
    expect(compare([
      plan(),
      plan({ id: 'all', kind: 'ALL', customerTotalKrw: -500 }),
      plan({ id: 'partial', kind: 'PARTIAL', customerTotalKrw: 12.5 }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'separate' });
  });

  it('is deterministic on ties and prefers no delay', () => {
    expect(compare([
      plan({ customerTotalKrw: 30_000 }),
      plan({ id: 'all', kind: 'ALL', customerTotalKrw: 30_000, additionalWaitDays: 1 }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'separate' });
  });

  it('blocks duplicate ids that could override an approved plan', () => {
    expect(compare([plan(), plan({ customerTotalKrw: 1_000 })]))
      .toEqual({ status: 'REVIEW_REQUIRED', reasons: ['DUPLICATE_PLAN_ID'] });
  });

  it('requires an interpretable verification timestamp', () => {
    expect(compare([plan()], { nowIso: 'not-a-date' }))
      .toEqual({ status: 'REVIEW_REQUIRED', reasons: ['INVALID_AS_OF_TIME'] });
  });


  it('RED: does not compare plans containing different SKUs or quantities', () => {
    expect(compare([
      plan(),
      plan({ id: 'all', kind: 'ALL', manifestFingerprint: 'skuA:1,skuC:1', customerTotalKrw: 10 }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'separate' });
  });

  it('RED: all multi-order consolidation needs explicit consent even without delay', () => {
    expect(compare([
      plan(),
      plan({ id: 'all', kind: 'ALL', customerTotalKrw: 32_000, additionalWaitDays: 0 }),
    ])).toMatchObject({ status: 'RECOMMENDED', recommendedPlanId: 'all', customerConsentRequired: true });
  });

  it('cannot choose an unverifiable DDP baseline', () => {
    expect(compare([plan({ ddpVerified: false }), plan({
      id: 'all', kind: 'ALL', customerTotalKrw: 5_000,
    })])).toEqual({ status: 'REVIEW_REQUIRED', reasons: ['BASELINE_NOT_VERIFIED'] });
  });
});
