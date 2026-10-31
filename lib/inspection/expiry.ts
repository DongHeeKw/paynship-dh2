/**
 * Inspection 72h workflow — 만료 처리 (v1.1 Policy + v2.0 Inspection Spec).
 *
 * 흐름:
 *   findings notifiedAt → 72h 응답 대기
 *   미응답 + 72h 경과 → defaultApplied=true, customerChoice='SHIP_AS_IS'
 *
 * "SHIP_AS_IS" = 발견된 문제 받아들이고 발송 진행 (가장 보수적 기본값).
 * 운영자 별도 결정 가능 (예: EXCHANGE / REFUND) — 그 경우는 본 cron 적용 X.
 */

import { prisma } from '@/lib/db/prisma';

export const INSPECTION_RESPONSE_HOURS = 72;

export interface InspectionExpiryResult {
  processedCount: number;
  defaultApplied: number;
  errors: Array<{ responseId: string; error: string }>;
}

export async function processExpiredInspections(
  now: Date = new Date(),
): Promise<InspectionExpiryResult> {
  const expired = await prisma.inspectionResponse.findMany({
    where: {
      customerChoice: null,
      respondedAt: null,
      defaultApplied: false,
      responseDeadline: { lt: now },
    },
  });

  const result: InspectionExpiryResult = {
    processedCount: 0,
    defaultApplied: 0,
    errors: [],
  };

  for (const item of expired) {
    try {
      await prisma.inspectionResponse.update({
        where: { id: item.id },
        data: {
          customerChoice: 'SHIP_AS_IS',
          respondedAt: now,
          defaultApplied: true,
          resolution: 'Auto-applied SHIP_AS_IS after 72h no-response',
        },
      });
      result.processedCount++;
      result.defaultApplied++;
    } catch (err) {
      result.errors.push({
        responseId: item.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
