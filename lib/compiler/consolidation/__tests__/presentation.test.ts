import { describe, expect, it } from 'vitest';
import { consolidationCopy } from '../presentation';
import type { ConsolidationDecision } from '../recommend';

const result: ConsolidationDecision = {
  status: 'RECOMMENDED',
  recommendedPlanId: 'wait-together',
  recommendedKind: 'WAIT',
  baselineCustomerTotalKrw: 34_000,
  selectedCustomerTotalKrw: 26_000,
  estimatedCustomerSavingsKrw: 8_000,
  extraWaitDays: 3,
  customerConsentRequired: true,
  alternatives: [
    { planId: 'separate', totalKrw: 34_000, extraWaitDays: 0 },
    { planId: 'wait-together', totalKrw: 26_000, extraWaitDays: 3 },
  ],
};

describe('consolidation benefits copy', () => {
  it('shows specific savings as the headline rather than recommending jargon', () => {
    expect(consolidationCopy(result)).toMatchObject({
      headline: '함께 배송하면 8,000원 아낄 수 있어요',
      savings: '8,000원',
      waiting: '3일 더 기다려야 해요',
      showConsentAction: true,
    });
  });

  it('does not misrepresent zero savings as a benefit', () => {
    expect(consolidationCopy({ ...result, estimatedCustomerSavingsKrw: 0, recommendedPlanId: 'separate' })).toMatchObject({
      headline: '따로 보내는 게 더 유리해요',
      savings: null,
      showConsentAction: false,
    });
  });

  it('does not invent savings or approval when shipping proof is missing', () => {
    expect(consolidationCopy({ status: 'REVIEW_REQUIRED', reasons: ['BASELINE_NOT_VERIFIED'] })).toEqual({
      headline: '배송비를 확인하고 있어요',
      summary: '필요한 운송비와 통관 정보를 확인한 뒤 배송 방법을 안내해 드릴게요.',
      savings: null,
      waiting: null,
      recommendedPlanId: null,
      showConsentAction: false,
    });
  });

  it('does not promise extra waiting when there is none', () => {
    expect(consolidationCopy({ ...result, extraWaitDays: 0 })).toMatchObject({
      waiting: '추가 대기 없이 함께 보낼 수 있어요',
    });
  });
});
