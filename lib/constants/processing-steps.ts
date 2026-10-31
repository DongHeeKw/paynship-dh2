/**
 * Processing Steps Constants
 *
 * Defines the steps shown in ThinkingIndicator for each intent type.
 * All labels are in Korean for the Korean shopping assistant.
 */

import type { ProcessingStep, IntentType } from '@/types';

/**
 * Create a fresh copy of steps with 'pending' status
 */
function createSteps(steps: Omit<ProcessingStep, 'status'>[]): ProcessingStep[] {
  return steps.map((step, index) => ({
    ...step,
    status: index === 0 ? 'in_progress' : 'pending',
  }));
}

/**
 * Processing steps for each intent type
 */
export const PROCESSING_STEPS: Record<IntentType, Omit<ProcessingStep, 'status'>[]> = {
  general: [
    { id: 'analyzing', label: '요청 분석 중...' },
    { id: 'generating', label: '응답 생성 중...' },
  ],
  search: [
    { id: 'analyzing', label: '요청 분석 중...' },
    { id: 'searching', label: '상품 검색 중...' },
    { id: 'organizing', label: '결과 정리 중...' },
  ],
  scrape: [
    { id: 'analyzing', label: '요청 분석 중...' },
    { id: 'scraping', label: '상품 정보 수집 중...' },
    { id: 'processing', label: '정보 정리 중...' },
  ],
  cart: [
    { id: 'processing', label: '요청 처리 중...' },
    { id: 'updating', label: '장바구니 업데이트 중...' },
  ],
  checkout: [
    { id: 'preparing', label: '결제 준비 중...' },
    { id: 'calculating', label: '배송비 계산 중...' },
    { id: 'generating', label: '견적서 생성 중...' },
  ],
  qna: [
    { id: 'understanding', label: '질문 이해 중...' },
    { id: 'answering', label: '답변 생성 중...' },
  ],
};

/**
 * Get processing steps for a given intent type
 * Returns a fresh copy with initial status
 */
export function getStepsForIntent(intent: IntentType): ProcessingStep[] {
  const steps = PROCESSING_STEPS[intent] || PROCESSING_STEPS.general;
  return createSteps(steps);
}

/**
 * Detect intent from user message
 * Simple keyword-based detection for client-side use
 */
export function detectIntent(message: string): IntentType {
  const lowerMessage = message.toLowerCase();

  // URL detection → scrape
  if (lowerMessage.includes('http://') || lowerMessage.includes('https://') ||
      lowerMessage.includes('.com') || lowerMessage.includes('.kr')) {
    return 'scrape';
  }

  // Search keywords
  const searchKeywords = ['검색', '찾아', '추천', '보여', '뭐 있', '어떤', 'search', 'find', 'show'];
  if (searchKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'search';
  }

  // Cart keywords
  const cartKeywords = ['장바구니', '담아', '추가', '빼', '삭제', 'cart', 'add', 'remove'];
  if (cartKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'cart';
  }

  // Checkout keywords
  const checkoutKeywords = ['결제', '구매', '주문', '배송', '견적', 'checkout', 'buy', 'order', 'shipping'];
  if (checkoutKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'checkout';
  }

  // QnA keywords
  const qnaKeywords = ['어떻게', '왜', '뭐야', '알려', '설명', '?', 'how', 'what', 'why', 'explain'];
  if (qnaKeywords.some(kw => lowerMessage.includes(kw))) {
    return 'qna';
  }

  return 'general';
}

/**
 * Get estimated duration for each intent type (ms)
 * Used for step progression timing
 */
export const INTENT_DURATIONS: Record<IntentType, number> = {
  general: 2000,
  search: 3000,
  scrape: 5000,
  cart: 1500,
  checkout: 4000,
  qna: 2000,
};

/**
 * Minimum display time to prevent flickering (ms)
 */
export const MIN_DISPLAY_TIME = 1000;
