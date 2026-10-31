'use client';

/**
 * PayNShip v2.1 — 9-Step Timeline
 *
 * 수직 stepper UI. 각 단계: icon + label + description.
 * done / current / pending 상태 색상 구분.
 */

import React from 'react';
import type { StepInfo, StepState } from '@/lib/procurement/nine-step';

export interface TimelineStep extends StepInfo {
  state: StepState;
}

export interface TimelineViewProps {
  steps: TimelineStep[];
  /** 특수 종료 상태 */
  terminationKind?: 'cancelled' | 'failed';
}

export function TimelineView({ steps, terminationKind }: TimelineViewProps) {
  if (terminationKind) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <div className="text-4xl">{terminationKind === 'cancelled' ? '🚫' : '⚠️'}</div>
        <div className="mt-2 text-lg font-semibold">
          {terminationKind === 'cancelled' ? '주문이 취소되었어요' : '주문 처리에 문제가 발생했어요'}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          문의사항은 고객센터로 연락주세요.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative">
      {steps.map((s, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <li key={s.step} className="relative pb-6 pl-10 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-full w-0.5 ${
                  s.state === 'done' ? 'bg-[var(--pn-brand)]' : 'bg-gray-200'
                }`}
                aria-hidden
              />
            )}
            <StepBadge step={s.step} state={s.state} />
            <div className="ml-2 flex items-center gap-2">
              <span className={`text-sm font-semibold ${
                s.state === 'current' ? 'text-[var(--pn-brand)]' :
                s.state === 'done' ? 'text-gray-900' :
                'text-gray-400'
              }`}>
                {s.labelKo}
              </span>
              {s.state === 'current' && (
                <span className="rounded-full bg-[var(--pn-brand)] px-2 py-0.5 text-[10px] font-bold text-white">
                  진행 중
                </span>
              )}
              {s.state === 'done' && <CheckIcon />}
            </div>
            <p className={`mt-1 text-xs ${
              s.state === 'pending' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {s.description}
              {s.expectedDurationHint && s.state !== 'done' && (
                <span className="ml-1 text-gray-400"> · 예상 {s.expectedDurationHint}</span>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function StepBadge({ step, state }: { step: number; state: StepState }) {
  const classes =
    state === 'done'
      ? 'bg-[var(--pn-brand)] text-white'
      : state === 'current'
        ? 'bg-white text-[var(--pn-brand)] border-2 border-[var(--pn-brand)]'
        : 'bg-gray-100 text-gray-400';

  return (
    <div
      className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${classes}`}
      aria-label={`Step ${step}, ${state}`}
    >
      {state === 'done' ? '✓' : step}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.704 5.296a1 1 0 010 1.408l-8 8a1 1 0 01-1.408 0l-4-4a1 1 0 111.408-1.408L8 12.592l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
    </svg>
  );
}
