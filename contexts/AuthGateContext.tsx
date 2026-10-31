'use client';

/**
 * PayNShip v2.1 — Auth Gate Context (Graduated Enforcement)
 *
 * 3-tier 로그인 강제 상태를 제공:
 *  - Tier 1: 비로그인 채팅 세션 3회 이상 → 가입 강제 (middleware가 카운팅)
 *  - Tier 2: 카트 3개 이상 담기 → 로그인 강제 (Cart context에서 호출)
 *  - Tier 3: 결제 희망 → 필수 (Checkout 진입 시)
 *
 * 모든 tier는 <LoginEnforcementModal />을 띄워 사용자를 막음.
 * 모달은 dismissible X — 로그인/가입이 완료되어야 작업 계속.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export type AuthGateTier = 'tier1' | 'tier2' | 'tier3';

export interface AuthGateState {
  /** 현재 모달 표시 여부 */
  isGated: boolean;
  /** 어느 tier가 트리거했는지 */
  activeTier: AuthGateTier | null;
  /** 사용자 메시지 (tier별 다름) */
  reason: string | null;

  /** Tier 1 발동 (middleware/chat에서 호출) */
  triggerTier1: () => void;
  /** Tier 2 발동 (cart에서 호출) */
  triggerTier2: () => void;
  /** Tier 3 발동 (checkout에서 호출) */
  triggerTier3: () => void;

  /** 외부에서 수동 닫기 (로그인 성공 후 호출) */
  clear: () => void;
}

const defaultValue: AuthGateState = {
  isGated: false,
  activeTier: null,
  reason: null,
  triggerTier1: () => {},
  triggerTier2: () => {},
  triggerTier3: () => {},
  clear: () => {},
};

const AuthGateContext = createContext<AuthGateState>(defaultValue);

const TIER_MESSAGES: Record<AuthGateTier, string> = {
  tier1: '이제 본격적으로 쇼핑하시려면 회원가입이 필요해요.\n주문 상태도 바로 추적할 수 있어요.',
  tier2: '여러 상품을 담으려면 로그인이 필요해요.\n카트 분실 없이 언제든 이어받을 수 있습니다.',
  tier3: '결제하시려면 로그인이 필요합니다.\n주문 이력과 배송 추적을 위해 계정이 필요해요.',
};

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { user, isGuest } = useAuth();
  const [activeTier, setActiveTier] = useState<AuthGateTier | null>(null);

  const trigger = useCallback(
    (tier: AuthGateTier) => {
      // 이미 로그인 상태면 무시
      if (user && !isGuest) return;
      setActiveTier(tier);
    },
    [user, isGuest],
  );

  const triggerTier1 = useCallback(() => trigger('tier1'), [trigger]);
  const triggerTier2 = useCallback(() => trigger('tier2'), [trigger]);
  const triggerTier3 = useCallback(() => trigger('tier3'), [trigger]);
  const clear = useCallback(() => setActiveTier(null), []);

  const value = useMemo<AuthGateState>(
    () => ({
      isGated: activeTier !== null,
      activeTier,
      reason: activeTier ? TIER_MESSAGES[activeTier] : null,
      triggerTier1,
      triggerTier2,
      triggerTier3,
      clear,
    }),
    [activeTier, triggerTier1, triggerTier2, triggerTier3, clear],
  );

  return <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>;
}

export function useAuthGate(): AuthGateState {
  return useContext(AuthGateContext);
}
