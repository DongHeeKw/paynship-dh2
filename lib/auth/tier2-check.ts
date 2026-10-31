/**
 * PayNShip v2.1 — Auth Tier 2 enforcement check (서버 사이드)
 *
 * 로직:
 *  - 로그인 사용자 → 언제나 통과 (tier 2 해당 없음)
 *  - 비로그인 + cart item 수 < 3 → 통과
 *  - 비로그인 + cart item 수 >= 3 → enforcement 필요
 *
 * 기존 Cart 모델 (guestToken 또는 userId로 소유) 기반.
 */

import { prisma } from '@/lib/db/prisma';

export const TIER_2_THRESHOLD = 3;

export interface Tier2CheckResult {
  /** true면 추가 허용, false면 로그인 강제 */
  allowed: boolean;
  /** 현재 카트 아이템 수 */
  currentItemCount: number;
  /** 현재 새 아이템 추가 시도 중이면 true */
  attemptingAdd: boolean;
  /** 이유 (allowed=false 시) */
  reason?: 'tier2_threshold_reached';
}

export interface Tier2CheckParams {
  /** Supabase user id (로그인 시) */
  userId?: string | null;
  /** Guest token (비로그인 세션용) */
  guestToken?: string | null;
  /** 이번에 추가하려는 항목 수 (기본 1) */
  addingCount?: number;
}

/**
 * 카트에 추가 가능한지 확인.
 *
 * 호출 시점: cart에 아이템 add 직전 (서버 사이드).
 * 결과: allowed=false인 경우 클라이언트가 AuthGate tier2 모달 표시.
 */
export async function checkTier2Allowed(
  params: Tier2CheckParams,
): Promise<Tier2CheckResult> {
  const { userId, guestToken, addingCount = 1 } = params;

  // 로그인 사용자는 항상 허용
  if (userId) {
    return {
      allowed: true,
      currentItemCount: 0, // 로그인 사용자는 count 무시
      attemptingAdd: addingCount > 0,
    };
  }

  // 비로그인 + guestToken 없음 → 첫 세션
  if (!guestToken) {
    // 아직 카트 자체가 없으니 0개, adding 1개 → allowed
    return {
      allowed: addingCount < TIER_2_THRESHOLD,
      currentItemCount: 0,
      attemptingAdd: true,
      ...(addingCount >= TIER_2_THRESHOLD ? { reason: 'tier2_threshold_reached' as const } : {}),
    };
  }

  // 비로그인 + guestToken → 기존 카트 item 수 조회
  const cart = await prisma.cart.findUnique({
    where: { guestToken },
    select: { id: true, items: { select: { quantity: true } } },
  });

  const currentItemCount = cart
    ? cart.items.reduce((sum, i) => sum + (i.quantity ?? 1), 0)
    : 0;

  const postCount = currentItemCount + addingCount;
  const allowed = postCount < TIER_2_THRESHOLD + 1;
  // threshold=3 기준: 3개까지는 허용, 4번째 추가하려는 순간(post >= 4) 강제
  // 하지만 PRD는 "3개 이상 담기" = 3번째 담는 순간 강제. 해석 여지.
  // MVP: post > threshold 이면 차단 (즉 3개 유지는 OK, 4번째는 차단)
  //   → 3개 담은 상태에서 하나 더 담으려 할 때 Tier 2 발동
  //   → PRD 의도가 "3개째 담을 때부터"라면 >= 로 변경 가능. 논의 필요.

  return {
    allowed,
    currentItemCount,
    attemptingAdd: true,
    ...(!allowed ? { reason: 'tier2_threshold_reached' as const } : {}),
  };
}
