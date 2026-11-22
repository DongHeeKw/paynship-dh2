import type { ConsolidationDecision } from './recommend';

/** UI language derives from the verified compiler result, not a static sales slogan. */
export interface ConsolidationCopy {
  headline: string;
  summary: string;
  savings: string | null;
  waiting: string | null;
  recommendedPlanId: string | null;
  showConsentAction: boolean;
}

function won(amount: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
}

export function consolidationCopy(decision: ConsolidationDecision): ConsolidationCopy {
  if (decision.status === 'REVIEW_REQUIRED') {
    return {
      headline: '배송비를 확인하고 있어요',
      summary: '필요한 운송비와 통관 정보를 확인한 뒤 배송 방법을 안내해 드릴게요.',
      savings: null,
      waiting: null,
      recommendedPlanId: null,
      showConsentAction: false,
    };
  }

  if (decision.estimatedCustomerSavingsKrw <= 0) {
    return {
      headline: '따로 보내는 게 더 유리해요',
      summary: '지금 확인된 조건에서는 배송을 나누는 편이 더 저렴하거나 동일한 비용이에요.',
      savings: null,
      waiting: null,
      recommendedPlanId: decision.recommendedPlanId,
      showConsentAction: false,
    };
  }

  return {
    headline: `함께 배송하면 ${won(decision.estimatedCustomerSavingsKrw)} 아낄 수 있어요`,
    summary: '같은 배송지로 가는 상품을 묶었을 때의 예상 비용을 비교했어요.',
    savings: won(decision.estimatedCustomerSavingsKrw),
    waiting: decision.extraWaitDays > 0
      ? `${decision.extraWaitDays}일 더 기다려야 해요`
      : '추가 대기 없이 함께 보낼 수 있어요',
    recommendedPlanId: decision.recommendedPlanId,
    showConsentAction: decision.customerConsentRequired,
  };
}
