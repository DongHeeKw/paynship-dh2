'use client';

/**
 * PayNShip v2.1 — CS Handoff Button
 *
 * 주문 상세에서 "운영자 연결 요청". 드롭다운으로 reason 선택.
 */

import React, { useState } from 'react';

export type HandoffReason = 'shipping_delay' | 'wrong_product' | 'refund_request' | 'customs_issue' | 'other';

const REASON_LABELS: Record<HandoffReason, string> = {
  shipping_delay: '배송 지연 문의',
  wrong_product: '상품 이상',
  refund_request: '환불 요청',
  customs_issue: '통관 문제',
  other: '기타 문의',
};

export interface HandoffButtonProps {
  orderId: string;
  className?: string;
}

type State =
  | { kind: 'idle' }
  | { kind: 'open' }
  | { kind: 'submitting'; reason: HandoffReason }
  | { kind: 'success'; reason: HandoffReason; at: string }
  | { kind: 'error'; message: string };

export function HandoffButton({ orderId, className }: HandoffButtonProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [reason, setReason] = useState<HandoffReason>('shipping_delay');
  const [note, setNote] = useState('');

  async function submit() {
    setState({ kind: 'submitting', reason });
    try {
      const res = await fetch('/api/cs/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, reason, message: note || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429 && body.cooldown) {
          setState({ kind: 'error', message: '최근 요청이 있어요. 10분 후 다시 시도해주세요.' });
          return;
        }
        setState({ kind: 'error', message: body?.error ?? `HTTP ${res.status}` });
        return;
      }
      const data = await res.json();
      setState({ kind: 'success', reason, at: data.requestedAt });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  if (state.kind === 'success') {
    return (
      <div className={`rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 ${className ?? ''}`}>
        ✓ 운영자 연결 요청이 접수됐어요. 영업시간 내 빠르게 답변드릴게요.
      </div>
    );
  }

  if (state.kind === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setState({ kind: 'open' })}
        className={`w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 ${className ?? ''}`}
      >
        🙋 운영자 연결 요청
      </button>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">운영자 연결 요청</h3>
        <button
          type="button"
          onClick={() => setState({ kind: 'idle' })}
          className="text-gray-400 hover:text-gray-600"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm text-gray-600">문의 유형</span>
        <select
          value={reason}
          onChange={e => setReason(e.target.value as HandoffReason)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          disabled={state.kind === 'submitting'}
        >
          {(Object.keys(REASON_LABELS) as HandoffReason[]).map(r => (
            <option key={r} value={r}>
              {REASON_LABELS[r]}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm text-gray-600">상세 내용 (선택)</span>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="운영자에게 전달할 내용을 적어주세요"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          disabled={state.kind === 'submitting'}
        />
        <span className="mt-1 block text-right text-xs text-gray-400">{note.length} / 1000</span>
      </label>

      {state.kind === 'error' && (
        <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
          ❌ {state.message}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setState({ kind: 'idle' })}
          disabled={state.kind === 'submitting'}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={state.kind === 'submitting'}
          className="flex-1 rounded-lg bg-[var(--pn-brand)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
        >
          {state.kind === 'submitting' ? '요청 중…' : '요청 전송'}
        </button>
      </div>
    </div>
  );
}
