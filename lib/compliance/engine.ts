/**
 * Compliance Engine — 단일 진입점.
 *
 * preflightCheck(items, destination) →
 *   1. 박스 분리 (HS prefix / DG / 검역)
 *   2. 라인별 duty/tax 계산 (FTA / Section 321 / EU §3 / 기본 관세율)
 *   3. 운영자 동의 필요 플래그
 *
 * v2.0 ADR_Consolidation_Compliance + ADR_Domestic_Procurement_9Step 기반.
 *
 * 사용처 (계획):
 *   - Cart-add preflight (모듈 04)
 *   - Checkout review (모듈 05)
 *   - Admin: /admin/compliance/* 페이지
 */

import { splitIntoBoxes } from './box-split';
import { calculateDuties } from './duty-calculator';
import {
  ComplianceCheckInput,
  ComplianceCheckResult,
  ComplianceWarning,
} from './types';

export async function preflightCheck(
  input: ComplianceCheckInput,
): Promise<ComplianceCheckResult> {
  const evaluatedAt = input.evaluatedAt ?? new Date();

  const { boxes, warnings: boxWarnings } = splitIntoBoxes(input.items);

  const { duties, warnings: dutyWarnings, totalDutyUsd, totalTaxUsd } =
    await calculateDuties({
      items: input.items,
      destinationCountry: input.destinationCountry,
      evaluatedAt,
    });

  const warnings: ComplianceWarning[] = [...boxWarnings, ...dutyWarnings];

  const requiresUserConsent = warnings.some(w =>
    w.code === 'DG_BOX_SPLIT' ||
    w.code === 'QUARANTINE_BOX_SPLIT' ||
    w.code === 'EU_VERIFICATION_REQUIRED',
  );

  return {
    boxes,
    duties,
    warnings,
    totalDutyUsd,
    totalTaxUsd,
    requiresUserConsent,
  };
}

export type {
  ComplianceCheckInput,
  ComplianceCheckResult,
  ComplianceItem,
  ComplianceBox,
  ComplianceWarning,
  LineDutyResult,
  DutyAppliedRule,
} from './types';
