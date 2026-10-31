/**
 * PayNShip v2.1 — 9단계 구매대행 타임라인 매핑
 *
 * ProcurementTaskStatus (17 enum) → 9 visible steps for customer UX.
 * v2.0 ADR Domestic Procurement 9Step 참조.
 */

import type { ProcurementTaskStatus } from '@prisma/client';

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type StepState = 'done' | 'current' | 'pending';

export interface StepInfo {
  step: StepNumber;
  key: string;
  labelKo: string;
  labelEn: string;
  description: string;
  expectedDurationHint?: string;
}

export const NINE_STEPS: StepInfo[] = [
  {
    step: 1,
    key: 'paid',
    labelKo: '결제 완료',
    labelEn: 'Payment Received',
    description: '구매대행 준비 중이에요.',
    expectedDurationHint: '즉시',
  },
  {
    step: 2,
    key: 'procurement_started',
    labelKo: '국내 판매처 주문',
    labelEn: 'Domestic Ordering',
    description: '원 판매처에 주문을 넣고 있어요.',
    expectedDurationHint: '1–2일',
  },
  {
    step: 3,
    key: 'domestic_shipping',
    labelKo: '국내 배송',
    labelEn: 'Domestic Shipping',
    description: '판매처 → 창고로 이동 중이에요.',
    expectedDurationHint: '2–4일',
  },
  {
    step: 4,
    key: 'warehoused',
    labelKo: '입고 및 검수',
    labelEn: 'Inspection',
    description: '창고에서 상품을 확인하고 있어요.',
    expectedDurationHint: '1일',
  },
  {
    step: 5,
    key: 'repackaging',
    labelKo: '재포장 준비',
    labelEn: 'Consolidation',
    description: '통합 발송 포장 진행 중이에요.',
    expectedDurationHint: '1일',
  },
  {
    step: 6,
    key: 'intl_shipped',
    labelKo: '국제 배송 출발',
    labelEn: 'International Shipping',
    description: 'AcrossB로 국제 배송이 시작되었어요.',
    expectedDurationHint: '3–7일',
  },
  {
    step: 7,
    key: 'customs',
    labelKo: '통관 진행',
    labelEn: 'Customs Clearance',
    description: '도착국 세관에서 통관 진행 중이에요.',
    expectedDurationHint: '1–3일',
  },
  {
    step: 8,
    key: 'intl_delivered',
    labelKo: '국제 배송 도착',
    labelEn: 'Delivered to Destination',
    description: '배송 완료! 수령 확인을 기다려요.',
  },
  {
    step: 9,
    key: 'completed',
    labelKo: '수령 확정',
    labelEn: 'Completed',
    description: '주문이 완료되었습니다.',
  },
];

/**
 * ProcurementTaskStatus → Step number 매핑.
 * 없는 status(FAILED, CANCELLED 등)는 undefined.
 */
const STATUS_TO_STEP: Partial<Record<ProcurementTaskStatus, StepNumber>> = {
  QUEUED: 1,
  ORDER_RECEIVED: 1,
  ORDER_CONFIRMED: 1,
  RESEARCHING: 2,
  READY_TO_BUY: 2,
  PURCHASED: 2,
  PROCUREMENT_IN_PROGRESS: 2,
  PROCURED: 3,
  DOMESTIC_SHIPPING: 3,
  DOMESTIC_DELIVERED: 4,
  WAREHOUSED: 4,
  INTL_SHIPMENT_CREATED: 6,
};

/**
 * 현재 status → step number.
 * 인식 못하면 step 1로 fallback.
 */
export function statusToStep(status: ProcurementTaskStatus): StepNumber {
  return STATUS_TO_STEP[status] ?? 1;
}

/**
 * 특별 상태 판정 (취소/실패).
 */
export function isTerminated(status: ProcurementTaskStatus): {
  terminated: boolean;
  kind?: 'cancelled' | 'failed';
} {
  if (status === 'CANCELLED') return { terminated: true, kind: 'cancelled' };
  if (status === 'FAILED') return { terminated: true, kind: 'failed' };
  return { terminated: false };
}

/**
 * 각 step의 상태 (done / current / pending) 계산.
 */
export function computeStepStates(currentStep: StepNumber): Record<StepNumber, StepState> {
  const result = {} as Record<StepNumber, StepState>;
  for (const s of NINE_STEPS) {
    if (s.step < currentStep) result[s.step] = 'done';
    else if (s.step === currentStep) result[s.step] = 'current';
    else result[s.step] = 'pending';
  }
  return result;
}

/**
 * 고객에게 표시할 한 줄 요약.
 */
export function getCurrentStepSummary(status: ProcurementTaskStatus, lang: 'ko' | 'en' = 'ko'): string {
  const term = isTerminated(status);
  if (term.terminated) {
    if (term.kind === 'cancelled') return lang === 'ko' ? '주문이 취소되었습니다' : 'Order cancelled';
    return lang === 'ko' ? '주문 처리에 문제가 발생했어요' : 'Order failed';
  }
  const step = statusToStep(status);
  const info = NINE_STEPS.find(s => s.step === step);
  if (!info) return '진행 중';
  return lang === 'ko' ? info.labelKo : info.labelEn;
}
