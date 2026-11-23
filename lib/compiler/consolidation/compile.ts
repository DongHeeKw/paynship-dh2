import { assessmentKey, compilerInputSchema, currentEvidence, DAY_MS, groupKey,
  type CompilerInput, type Partition, type Rate } from './contracts';
import { enumeratePartitions } from './partitions';
import { ratePackage } from './rate';
import { recommendConsolidation, type ConsolidationDecision, type ConsolidationPlan, type PlanKind } from './recommend';

export interface PackageCalculation {
  itemIds: string[]; dispatchAt: string; measurementRef: string;
  actualWeightGrams: number; volumetricWeightGrams: number; billableWeightGrams: number;
  freightKrw: number; surchargesKrw: number; handlingKrw: number; storageKrw: number;
  internalHandlingKrw: number;
}
export interface PlanEvaluation {
  id: string; kind: PlanKind; groups: Partition; service: string; reasons: string[];
  packages: PackageCalculation[]; extraWaitDays: number; customerTotalKrw: number | null;
  charges: { dutyKrw: number; taxKrw: number; clearanceKrw: number } | null;
  evidenceRefs: string[]; expiresAt: string;
}
export interface Compilation {
  dataKind: CompilerInput['dataKind']; executionAllowed: false;
  decision: ConsolidationDecision; evaluations: PlanEvaluation[];
}

function evaluate(input: CompilerInput, groups: Partition, rate: Rate): PlanEvaluation {
  const now = Date.parse(input.nowIso);
  const result: PlanEvaluation = { id: `${JSON.stringify(groups)}:${rate.id}`, kind: 'SEPARATE', groups,
    service: rate.service, reasons: [], packages: [], extraWaitDays: 0, customerTotalKrw: null,
    charges: null, evidenceRefs: [rate.evidence.ref], expiresAt: rate.evidence.validUntil };
  if (!currentEvidence(rate.evidence, now)) result.reasons.push('RATE_EXPIRED');
  const recipient = input.items[0];
  if (rate.country !== recipient.country || rate.addressRef !== recipient.addressRef || rate.hubId !== input.hubId) {
    result.reasons.push('ROUTE_UNAVAILABLE');
  }
  for (const ids of groups) {
    const items = ids.map((id) => input.items.find((item) => item.id === id)!);
    const dispatch = Math.max(now, ...items.map((item) => Date.parse(item.readyAt)));
    const waitDays = items.map((item) => Math.ceil((dispatch - Math.max(now, Date.parse(item.readyAt))) / DAY_MS));
    result.extraWaitDays = Math.max(result.extraWaitDays, ...waitDays);
    if (items.some((item) => dispatch > Date.parse(item.dispatchBy)
      || dispatch + rate.transitDays * DAY_MS > Date.parse(item.deliverBy))) result.reasons.push('DELIVERY_DEADLINE');
    if (items.some((item) => dispatch > Date.parse(item.storageUntil))) result.reasons.push('STORAGE_LIMIT');
    const packing = input.packings.find((entry) => groupKey(entry.itemIds) === groupKey(ids));
    if (!packing) { result.reasons.push('MISSING_PACKING'); continue; }
    if (!packing.compatible) result.reasons.push('INCOMPATIBLE_ITEMS');
    if (packing.basis !== 'MEASURED') result.reasons.push('PACKING_NOT_MEASURED');
    const priced = ratePackage(packing, rate);
    if (!priced) { result.reasons.push('PACKAGE_OUTSIDE_RATE'); continue; }
    result.evidenceRefs.push(packing.measurementRef);
    result.packages.push({ itemIds: ids, dispatchAt: new Date(dispatch).toISOString(), measurementRef: packing.measurementRef,
      ...priced, handlingKrw: packing.customerHandlingKrw, internalHandlingKrw: packing.internalHandlingKrw,
      storageKrw: waitDays.reduce((a, b) => a + b, 0) * packing.customerStoragePerItemDayKrw });
  }
  if (groups.length < input.items.length) {
    result.kind = groups.length > 1 ? 'PARTIAL' : result.extraWaitDays > 0 ? 'WAIT' : 'ALL';
  }
  if (result.extraWaitDays > input.maxWaitDays) result.reasons.push('WAIT_LIMIT');
  const key = assessmentKey(input, groups, rate);
  const assessments = input.assessments.filter((entry) => entry.inputKey === key);
  const assessment = assessments.length === 1 ? assessments[0] : undefined;
  if (!assessment) result.reasons.push('MISSING_MATCHING_ASSESSMENT');
  else {
    result.evidenceRefs.push(assessment.evidence.ref);
    result.expiresAt = new Date(Math.min(Date.parse(result.expiresAt), Date.parse(assessment.validUntil),
      Date.parse(assessment.evidence.validUntil))).toISOString();
    if (!currentEvidence(assessment.evidence, now) || Date.parse(assessment.validUntil) <= now) result.reasons.push('ASSESSMENT_EXPIRED');
    if (!assessment.legal || !assessment.importerVerified || (input.requireDdp && !assessment.ddp)) result.reasons.push('TRADE_NOT_ELIGIBLE');
    const { dutyKrw, taxKrw, clearanceKrw } = assessment;
    if (dutyKrw === null || taxKrw === null || clearanceKrw === null) result.reasons.push('UNKNOWN_CHARGES');
    else result.charges = { dutyKrw, taxKrw, clearanceKrw };
  }
  result.reasons = [...new Set(result.reasons)];
  if (!result.reasons.length && result.charges) {
    result.customerTotalKrw = result.packages.reduce((sum, item) => sum + item.freightKrw + item.surchargesKrw
      + item.handlingKrw + item.storageKrw, 0) + Object.values(result.charges).reduce((a, b) => a + b, 0);
  }
  return result;
}

/** Advisory only. Trusted snapshot loading/authentication and real consent are separate, unimplemented adapters.
 * Search scope: all partitions of <=4 lines, <=4 services, one shared service per plan.
 * Costs cover remaining fulfillment only; already-paid merchandise/fees are neither changed nor counted twice.
 */
export function compileConsolidation(raw: CompilerInput): Compilation {
  const parsed = compilerInputSchema.safeParse(raw);
  const review = (reason: string): Compilation => ({ dataKind: raw?.dataKind === 'INTERNAL_SNAPSHOT' ? 'INTERNAL_SNAPSHOT' : 'SYNTHETIC_TEST_DATA',
    executionAllowed: false, evaluations: [], decision: { status: 'REVIEW_REQUIRED', reasons: [reason] } });
  if (!parsed.success) return review('INVALID_INPUT');
  const input = parsed.data;
  if (new Set(input.items.map((item) => item.id)).size !== input.items.length
    || new Set(input.rates.map((rate) => rate.id)).size !== input.rates.length
    || new Set(input.packings.map((packing) => groupKey(packing.itemIds))).size !== input.packings.length
    || input.packings.some((packing) => new Set(packing.itemIds).size !== packing.itemIds.length)) return review('DUPLICATE_ID');
  const first = input.items[0];
  if (input.items.some((item) => ['ownerId', 'recipientRef', 'addressRef', 'country'].some(
    (field) => item[field as keyof typeof item] !== first[field as keyof typeof first]))) return review('RECIPIENT_MISMATCH');
  if (input.items.some((item) => !['READY', 'EXPECTED'].includes(item.state)
    || (item.state === 'READY' && Date.parse(item.readyAt) > Date.parse(input.nowIso))
    || (item.state === 'EXPECTED' && Date.parse(item.readyAt) <= Date.parse(input.nowIso)))) return review('INVENTORY_NOT_PLANNABLE');
  const evaluations = enumeratePartitions(input.items.map((item) => item.id))
    .flatMap((groups) => [...input.rates].sort((a, b) => a.id.localeCompare(b.id)).map((rate) => evaluate(input, groups, rate)));
  const baseline = evaluations.filter((entry) => entry.kind === 'SEPARATE' && entry.customerTotalKrw !== null)
    .sort((a, b) => a.customerTotalKrw! - b.customerTotalKrw! || a.id.localeCompare(b.id))[0];
  const recipientKey = JSON.stringify([first.ownerId, first.recipientRef, first.addressRef, first.country]);
  const plans: ConsolidationPlan[] = evaluations.map((entry) => ({
    id: entry.id, kind: entry.kind, recipientKey,
    manifestFingerprint: JSON.stringify([...input.items].sort((a, b) => a.id.localeCompare(b.id))),
    customerTotalKrw: entry.customerTotalKrw, additionalWaitDays: entry.extraWaitDays,
    costComponentsVerified: !entry.reasons.length, customsVerified: !entry.reasons.length,
    carrierRateVerified: !entry.reasons.length, carrierRateExpiresAt: entry.expiresAt,
    legallyEligible: !entry.reasons.length, packageCompatible: !entry.reasons.length,
    meetsPromisedDelivery: !entry.reasons.length, ddpVerified: !entry.reasons.length,
  }));
  return { dataKind: input.dataKind, executionAllowed: false, evaluations,
    decision: baseline ? recommendConsolidation({ recipientKey, baselineSeparatePlanId: baseline.id,
      plans, nowIso: input.nowIso, requireDdp: input.requireDdp })
      : { status: 'REVIEW_REQUIRED', reasons: ['BASELINE_NOT_VERIFIED'] } };
}
