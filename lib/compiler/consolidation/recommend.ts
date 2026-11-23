/**
 * PayNShip consolidation recommendation kernel (pure, no DB, carrier calls, or side effects).
 *
 * This compares PRE-VALIDATED plans. A candidate is NOT verified merely because this
 * function returns a recommendation. Building parcel partitions, customs assessments,
 * carrier rates and legal eligibility belongs to upstream compiler phases.
 *
 * The user's selected delivery address, not GeoIP, determines the recipient key.
 * All monetary values are KRW integer minor units; no floating point customs logic.
 */

export type PlanKind = 'SEPARATE' | 'ALL' | 'PARTIAL' | 'WAIT';

export interface ConsolidationPlan {
  id: string;
  kind: PlanKind;
  recipientKey: string;
  /** Canonical ordered SKU+variant+quantity manifest; all candidate plans must match. */
  manifestFingerprint: string;
  /** Customer-facing total for identical items, quantities, destination and terms. */
  customerTotalKrw: number | null;
  /** Full comparison must include shipping, handling, tax and clearance differences. */
  costComponentsVerified: boolean;
  customsVerified: boolean;
  carrierRateVerified: boolean;
  carrierRateExpiresAt: string;
  legallyEligible: boolean;
  packageCompatible: boolean;
  meetsPromisedDelivery: boolean;
  /** Delay relative to the original shipment promise, not whole transit time. */
  additionalWaitDays: number;
  /** Destination and importer rules permit duty-prepaid service. */
  ddpVerified: boolean;
}

export interface ConsolidationInput {
  recipientKey: string;
  baselineSeparatePlanId: string;
  plans: readonly ConsolidationPlan[];
  nowIso: string;
  requireDdp: boolean;
}

export type ConsolidationDecision =
  | { status: 'REVIEW_REQUIRED'; reasons: string[] }
  | {
      status: 'RECOMMENDED';
      recommendedPlanId: string;
      recommendedKind: PlanKind;
      baselineCustomerTotalKrw: number;
      selectedCustomerTotalKrw: number;
      estimatedCustomerSavingsKrw: number;
      extraWaitDays: number;
      /** A recommendation cannot silently change an accepted delivery schedule. */
      customerConsentRequired: boolean;
      alternatives: readonly { planId: string; totalKrw: number; extraWaitDays: number }[];
    };

function isNonnegativeSafeInteger(value: number | null): value is number {
  return value !== null && Number.isSafeInteger(value) && value >= 0;
}

function verifiedForComparison(
  plan: ConsolidationPlan,
  input: ConsolidationInput,
  nowMs: number,
): boolean {
  const expiryMs = Date.parse(plan.carrierRateExpiresAt);

  return plan.recipientKey === input.recipientKey
    && plan.manifestFingerprint.length > 0
    && isNonnegativeSafeInteger(plan.customerTotalKrw)
    && plan.costComponentsVerified
    && plan.customsVerified
    && plan.carrierRateVerified
    && Number.isFinite(expiryMs)
    && expiryMs > nowMs
    && plan.legallyEligible
    && plan.packageCompatible
    && plan.meetsPromisedDelivery
    && Number.isSafeInteger(plan.additionalWaitDays)
    && plan.additionalWaitDays >= 0
    && (!input.requireDdp || plan.ddpVerified);
}

/**
 * Choose the least expensive VERIFIED legal plan. If costs tie, choose the
 * option with less waiting, then retain the baseline, then a stable plan id.
 *
 * The separate-shipment baseline is mandatory: without a fair baseline,
 * showing "you saved ..." would be misleading.
 */
export function recommendConsolidation(input: ConsolidationInput): ConsolidationDecision {
  const nowMs = Date.parse(input.nowIso);
  if (!Number.isFinite(nowMs)) {
    return { status: 'REVIEW_REQUIRED', reasons: ['INVALID_AS_OF_TIME'] };
  }

  if (!input.recipientKey || !input.baselineSeparatePlanId) {
    return { status: 'REVIEW_REQUIRED', reasons: ['MISSING_RECIPIENT_OR_BASELINE'] };
  }

  if (new Set(input.plans.map((plan) => plan.id)).size !== input.plans.length) {
    return { status: 'REVIEW_REQUIRED', reasons: ['DUPLICATE_PLAN_ID'] };
  }

  const baseline = input.plans.find((plan) => plan.id === input.baselineSeparatePlanId);
  if (!baseline || baseline.kind !== 'SEPARATE'
    || !verifiedForComparison(baseline, input, nowMs)) {
    return { status: 'REVIEW_REQUIRED', reasons: ['BASELINE_NOT_VERIFIED'] };
  }

  const eligible = input.plans
    .filter((plan) => plan.manifestFingerprint === baseline.manifestFingerprint)
    .filter((plan) => verifiedForComparison(plan, input, nowMs))
    .sort((a, b) =>
      (a.customerTotalKrw! - b.customerTotalKrw!)
      || (a.additionalWaitDays - b.additionalWaitDays)
      || (Number(b.id === baseline.id) - Number(a.id === baseline.id))
      || a.id.localeCompare(b.id),
    );

  // The baseline is always eligible here, so the non-null assertion is safe.
  const best = eligible[0]!;
  return {
    status: 'RECOMMENDED',
    recommendedPlanId: best.id,
    recommendedKind: best.kind,
    baselineCustomerTotalKrw: baseline.customerTotalKrw!,
    selectedCustomerTotalKrw: best.customerTotalKrw!,
    estimatedCustomerSavingsKrw: baseline.customerTotalKrw! - best.customerTotalKrw!,
    extraWaitDays: best.additionalWaitDays,
    // Even if delivery is not delayed, combining separate customer orders needs consent.
    customerConsentRequired: best.id !== baseline.id,
    alternatives: eligible.map((plan) => ({
      planId: plan.id,
      totalKrw: plan.customerTotalKrw!,
      extraWaitDays: plan.additionalWaitDays,
    })),
  };
}
