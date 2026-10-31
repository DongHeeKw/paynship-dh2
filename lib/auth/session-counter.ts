/**
 * PayNShip v2.1 — Session Counter
 *
 * Auth Tier 1: 비로그인 고객의 채팅 세션 수 추적.
 * 3회 이상 → 로그인/가입 강제 모달.
 *
 * 저장 위치:
 *  - 쿠키 `paynship:v2:session_count` (primary, 고객 인지 용)
 *  - Redis `paynship:v2:sess:<fp>` (backup, 쿠키 삭제 우회 방지)
 *
 * 세션 1회 = 브라우저 세션 쿠키 `paynship:v2:current_session` 이 없을 때 증가.
 * 즉 페이지 리로드 또는 새 탭에서 기존 세션 쿠키가 있으면 같은 세션으로 취급.
 * 브라우저 종료 시 현재 세션 쿠키가 만료되어 다음 방문 시 새 세션 카운트.
 */

import type { NextRequest } from 'next/server';

export const COOKIE_SESSION_COUNT = 'paynship:v2:session_count';
export const COOKIE_CURRENT_SESSION = 'paynship:v2:current_session';
export const COOKIE_FINGERPRINT = 'paynship:v2:fp';

/**
 * Tier 1 발동 임계값.
 */
export const AUTH_TIER_1_THRESHOLD = 3;

/**
 * 쿠키에서 현재 카운트 파싱. 없거나 invalid → 0.
 */
export function readSessionCount(req: NextRequest): number {
  const raw = req.cookies.get(COOKIE_SESSION_COUNT)?.value;
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * 현재 진행 중인 세션인지 여부. 세션 쿠키 존재 여부로 판단.
 */
export function isWithinCurrentSession(req: NextRequest): boolean {
  return !!req.cookies.get(COOKIE_CURRENT_SESSION)?.value;
}

/**
 * 새 세션으로 간주할지 판정 + 다음 카운트 계산.
 * - 새 세션 아님 → 카운트 변경 없음
 * - 새 세션 → 카운트 +1
 */
export function computeNextSessionState(req: NextRequest): {
  currentCount: number;
  nextCount: number;
  incremented: boolean;
  tier1Reached: boolean;
} {
  const current = readSessionCount(req);
  const within = isWithinCurrentSession(req);

  if (within) {
    return {
      currentCount: current,
      nextCount: current,
      incremented: false,
      tier1Reached: current >= AUTH_TIER_1_THRESHOLD,
    };
  }

  const next = current + 1;
  return {
    currentCount: current,
    nextCount: next,
    incremented: true,
    tier1Reached: next >= AUTH_TIER_1_THRESHOLD,
  };
}

export interface SetCountCookieOpts {
  value: number;
  maxAgeSeconds?: number;
}

/** 쿠키 설정 값 (Response headers set) — Next.js cookies API로 세팅 */
export const SESSION_COUNT_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  // 6개월 (세션 카운트 보존)
  maxAge: 60 * 60 * 24 * 180,
  httpOnly: false,  // 클라이언트에서도 읽을 수 있게 (badge 표시용)
  secure: process.env.NODE_ENV === 'production',
};

/** 현재 세션 쿠키 옵션 (브라우저 종료 시 만료) */
export const CURRENT_SESSION_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  // maxAge 미지정 → session cookie (브라우저 닫으면 삭제)
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
};
