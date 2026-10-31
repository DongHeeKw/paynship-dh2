/**
 * Duty / Tax 계산 — 도착국 + HS + FTA + 면제 임계값 종합.
 *
 * 적용 순서:
 *   1. Section 321 (미국, 단가 × 수량 < $800 라인) → duty=0, tax=0
 *   2. EU §3 (2026-07-01 이후, EU 도착, 라인 < €3) → Verification Hook (duty=0 보류)
 *   3. FTA preferentialRate (원산지+목적지+HS prefix)
 *   4. Standard duty (HsCodeRate) + Country VAT/GST
 *
 * DB lookups:
 *   - CountryTaxRate { duty/tax threshold, sales tax rate }
 *   - HsCodeRate { dutyRate }
 *   - FtaRate { preferentialRate, validFrom/Until }
 *
 * 모든 라인 USD 기준. 도착국 USD 환산 임계값 비교.
 */

import { prisma } from '@/lib/db/prisma';
import {
  ComplianceItem,
  LineDutyResult,
  DutyAppliedRule,
  ComplianceWarning,
} from './types';

/** EU §3 시행일 (2026-07-01) */
const EU_SECTION_3_START = new Date('2026-07-01T00:00:00Z');
/** EU §3 임계값 (€3 USD 환산 대략) */
const EU_SECTION_3_USD_THRESHOLD = 3.5;

/** EU member states (간소화 — 실제 운영은 ISO 코드 목록 필요) */
const EU_COUNTRIES = new Set([
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU','IE',
  'IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK',
]);

export interface CalcDutiesInput {
  items: ComplianceItem[];
  destinationCountry: string;
  evaluatedAt: Date;
}

export interface CalcDutiesOutput {
  duties: LineDutyResult[];
  warnings: ComplianceWarning[];
  totalDutyUsd: number;
  totalTaxUsd: number;
}

export async function calculateDuties(input: CalcDutiesInput): Promise<CalcDutiesOutput> {
  const { items, destinationCountry, evaluatedAt } = input;
  const dest = destinationCountry.toUpperCase();

  const countryRate = await prisma.countryTaxRate.findUnique({
    where: { countryCode: dest },
  });

  // Pre-fetch HS rates and FTA rates (origin+dest+prefix)
  const hsCodes = Array.from(new Set(items.map(i => i.hsCode).filter(Boolean) as string[]));
  const hsRates = hsCodes.length
    ? await prisma.hsCodeRate.findMany({
        where: { hsCode: { in: hsCodes }, isActive: true },
      })
    : [];
  const hsByCode = new Map(hsRates.map(r => [r.hsCode, r.dutyRate]));

  const ftaRates = await prisma.ftaRate.findMany({
    where: {
      destinationCountry: dest,
      isActive: true,
      validFrom: { lte: evaluatedAt },
      OR: [{ validUntil: null }, { validUntil: { gte: evaluatedAt } }],
    },
    orderBy: { hsCodePrefix: 'desc' }, // 더 긴 prefix 우선 매칭
  });

  const duties: LineDutyResult[] = [];
  const warnings: ComplianceWarning[] = [];
  let totalDutyUsd = 0;
  let totalTaxUsd = 0;

  for (const item of items) {
    const lineValueUsd = item.unitPriceUsd * item.quantity;
    const result = applyRules({
      item,
      lineValueUsd,
      dest,
      isEu: EU_COUNTRIES.has(dest),
      evaluatedAt,
      countryDutyThreshold: countryRate?.dutyThreshold ?? null,
      countrySalesTax: countryRate?.salesTaxRate ?? 0,
      hsRate: item.hsCode ? hsByCode.get(item.hsCode) ?? null : null,
      ftaCandidates: ftaRates,
    });
    duties.push(result);
    totalDutyUsd += result.dutyUsd;
    totalTaxUsd += result.taxUsd;
    if (result.verificationRequired) {
      warnings.push({
        code: 'EU_VERIFICATION_REQUIRED',
        message: 'EU §3 (€3 임계값) — Verification Hook 통과 필요',
        affectedLineIds: [item.lineId],
      });
    }
  }

  return {
    duties,
    warnings,
    totalDutyUsd: round2(totalDutyUsd),
    totalTaxUsd: round2(totalTaxUsd),
  };
}

function applyRules(ctx: {
  item: ComplianceItem;
  lineValueUsd: number;
  dest: string;
  isEu: boolean;
  evaluatedAt: Date;
  countryDutyThreshold: number | null;
  countrySalesTax: number;
  hsRate: number | null;
  ftaCandidates: Array<{
    originCountry: string;
    hsCodePrefix: string;
    preferentialRate: number;
    ftaName: string;
  }>;
}): LineDutyResult {
  const { item, lineValueUsd, dest, isEu, evaluatedAt } = ctx;

  // Rule 1: Section 321 (US, < $800 per shipment line)
  if (dest === 'US' && lineValueUsd < 800) {
    return {
      lineId: item.lineId,
      hsCode: item.hsCode,
      dutyUsd: 0,
      taxUsd: 0,
      rule: 'SECTION_321_FREE',
      verificationRequired: false,
    };
  }

  // Rule 2: EU §3 (2026-07-01 onwards, EU dest, line < ~€3.5 USD)
  if (
    isEu &&
    evaluatedAt >= EU_SECTION_3_START &&
    lineValueUsd < EU_SECTION_3_USD_THRESHOLD
  ) {
    return {
      lineId: item.lineId,
      hsCode: item.hsCode,
      dutyUsd: 0,
      taxUsd: 0,
      rule: 'EU_SECTION_3_HOOK',
      verificationRequired: true,
    };
  }

  // Rule 3: FTA preferential (origin+dest+hs prefix match)
  let appliedDutyRate = ctx.hsRate ?? 0;
  let appliedRule: DutyAppliedRule = 'STANDARD';
  let ftaName: string | undefined;

  if (item.hsCode && item.origin) {
    const hsNorm = item.hsCode.replace(/\./g, '');
    const match = ctx.ftaCandidates.find(
      f =>
        f.originCountry.toUpperCase() === item.origin.toUpperCase() &&
        hsNorm.startsWith(f.hsCodePrefix.replace(/\./g, '')),
    );
    if (match && match.preferentialRate < appliedDutyRate) {
      appliedDutyRate = match.preferentialRate;
      appliedRule = 'FTA_PREFERENTIAL';
      ftaName = match.ftaName;
    }
  }

  // Country duty threshold (관세 면제 기준)
  if (ctx.countryDutyThreshold != null && lineValueUsd < ctx.countryDutyThreshold) {
    appliedDutyRate = 0;
    if (appliedRule === 'STANDARD') appliedRule = 'NONE';
  }

  const dutyUsd = round2(lineValueUsd * appliedDutyRate);
  // VAT/GST 는 (상품가 + 관세) 기준이 일반적
  const taxUsd = round2((lineValueUsd + dutyUsd) * ctx.countrySalesTax);

  return {
    lineId: item.lineId,
    hsCode: item.hsCode,
    dutyUsd,
    taxUsd,
    rule: appliedRule,
    ftaName,
    verificationRequired: false,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
