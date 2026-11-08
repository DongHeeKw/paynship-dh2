'use client';

/**
 * PayNShip v2.1 — Login Enforcement Modal
 *
 * AuthGate에 의해 강제로 표시되는 로그인/가입 모달.
 * 기존 LoginModal과 차이점:
 *  - **Dismissible X** (backdrop 클릭해도 안 닫힘, close 버튼 없음)
 *  - Tier별 메시지 표시
 *  - 로그인 성공 시 clear()로만 닫힘
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/contexts/AuthGateContext';

export function LoginEnforcementModal() {
  const { isGated, activeTier, reason, clear } = useAuthGate();
  const { signIn } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  if (!isGated) return null;

  const handleSignIn = async () => {
    setSubmitting(true);
    setError('');
    try {
      await signIn();
      // OAuth redirect가 페이지 이탈시킴. clear는 redirect 후 onAuthStateChange에서 처리.
    } catch {
      setError('Google 로그인을 시작하지 못했습니다. Supabase 제공자 설정을 확인한 뒤 다시 시도해 주세요.');
      setSubmitting(false);
    }
  };

  // AuthContext가 user를 감지하면 clear 호출해주는게 깔끔 — AuthContext에 hook을 추가해야 하지만
  // MVP에서는 AuthGate를 사용하는 쪽에서 로그인 완료 감지 시 clear() 호출하도록 함.

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-gate-title"
    >
      {/* Backdrop — 클릭해도 안 닫힘 (강제 모달) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-gradient-to-br from-[var(--pn-brand)] to-[var(--pn-brand-dark,#003764)] flex items-center justify-center">
            <span className="text-2xl font-bold text-white">P</span>
          </div>

          <h2 id="auth-gate-title" className="mb-3 text-2xl font-bold text-gray-900">
            로그인이 필요합니다
          </h2>

          <p className="mb-2 whitespace-pre-line text-gray-700">
            {reason}
          </p>

          {activeTier && (
            <p className="mb-6 text-xs text-gray-400">
              {activeTier === 'tier1' && '무료 세션 3회 사용 완료'}
              {activeTier === 'tier2' && '카트 제한 도달'}
              {activeTier === 'tier3' && '결제 진행 전'}
            </p>
          )}

          <button
            type="button"
            onClick={handleSignIn}
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--pn-brand)] px-6 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? '이동 중…' : 'Google로 계속하기'}
          </button>
          {error && <p role="alert" className="error-message">{error}</p>}

          <p className="mt-6 text-xs text-gray-400">
            계속하면 <a href="/terms" className="underline">이용약관</a> 및{' '}
            <a href="/privacy" className="underline">개인정보처리방침</a>에 동의하게 됩니다.
          </p>

          {/* 강제 모달이지만 개발/디버깅용 escape hatch */}
          {process.env.NODE_ENV !== 'production' && (
            <button
              type="button"
              onClick={clear}
              className="mt-4 text-[10px] text-gray-300 hover:text-gray-500"
            >
              (dev) 모달 닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
