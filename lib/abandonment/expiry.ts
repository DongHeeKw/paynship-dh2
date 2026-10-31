/**
 * Abandonment 48h workflow — 만료 처리 로직 (v1.1 Policy).
 *
 * 흐름:
 *   detectedAt → customerNotifiedAt (즉시) → 48h 응답 대기
 *   48h 경과 + customerChoice == null → systemRecommendation 자동 적용 → finalDecision
 *
 * systemRecommendation 결정 (이미 AbandonmentLog 생성 시점에 계산됨):
 *   - reshipCostUsd 가 productValueKrw 대비 과한 경우 → ABANDON
 *   - 그 외 → RETURN
 *
 * 본 모듈은 만료된 항목을 일괄 처리만 담당.
 */

import { prisma } from '@/lib/db/prisma';

export const ABANDONMENT_RESPONSE_HOURS = 48;

export interface AbandonmentExpiryResult {
  processedCount: number;
  abandonedCount: number;
  returnedCount: number;
  errors: Array<{ logId: string; error: string }>;
}

/**
 * customerChoice 미응답 + 48h 경과 → systemRecommendation 자동 적용.
 */
export async function processExpiredAbandonments(
  now: Date = new Date(),
): Promise<AbandonmentExpiryResult> {
  const expiryCutoff = new Date(now.getTime() - ABANDONMENT_RESPONSE_HOURS * 60 * 60 * 1000);

  const expired = await prisma.abandonmentLog.findMany({
    where: {
      customerChoice: null,
      customerNotifiedAt: { lt: expiryCutoff },
      executedAt: null,
    },
  });

  const result: AbandonmentExpiryResult = {
    processedCount: 0,
    abandonedCount: 0,
    returnedCount: 0,
    errors: [],
  };

  for (const log of expired) {
    try {
      const finalDecision =
        log.systemRecommendation === 'ABANDON' ? 'ABANDON' : 'RETURN';

      await prisma.abandonmentLog.update({
        where: { id: log.id },
        data: {
          finalDecision,
          executedAt: now,
          // customerChoice 는 null 유지 (자동 기본값 적용 표시)
        },
      });

      result.processedCount++;
      if (finalDecision === 'ABANDON') result.abandonedCount++;
      else result.returnedCount++;
    } catch (err) {
      result.errors.push({
        logId: log.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
