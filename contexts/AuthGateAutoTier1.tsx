'use client';

/**
 * PayNShip v2.1 — Auto Tier 1 trigger
 *
 * 쿠키 `paynship:v2:session_count` 읽어서 3 이상이면 자동으로 Tier 1 모달 trigger.
 * middleware가 카운트를 관리하니 클라는 쿠키만 읽으면 됨.
 *
 * 로그인 사용자는 AuthGate가 무시하므로 무해.
 */

import { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useAuthGate } from './AuthGateContext';
import { AUTH_TIER_1_THRESHOLD, COOKIE_SESSION_COUNT } from '@/lib/auth/session-counter';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|; )' + name.replace(/[:.]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function AuthGateAutoTier1() {
  const { user, isGuest, loading } = useAuth();
  const { triggerTier1, clear, isGated, activeTier } = useAuthGate();

  useEffect(() => {
    if (loading) return;

    // 로그인 사용자면 어떤 gate든 clear
    if (user && !isGuest) {
      if (isGated) clear();
      return;
    }

    // 쿠키 카운트 읽기
    const raw = readCookie(COOKIE_SESSION_COUNT);
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= AUTH_TIER_1_THRESHOLD && activeTier !== 'tier1') {
      triggerTier1();
    }
  }, [user, isGuest, loading, isGated, activeTier, triggerTier1, clear]);

  return null;
}
