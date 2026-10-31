'use client';

/**
 * Admin — Warehouse Inspection 큐.
 *
 * 사용자 결정 (2026-05-16) 후속: v2.0 Inspection 옵션 (Basic $0 / Detail $7 + 72h SLA) UI.
 * 운영자는 72h 응답 대기 항목, expired 항목, 응답 완료 항목을 분리해 확인 + 강제 처리.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

type StatusFilter = 'PENDING' | 'EXPIRED' | 'RESPONDED' | 'ALL';

interface InspectionItem {
  id: string;
  orderId: string;
  sellerCode: string;
  findings: unknown;
  notifiedAt: string;
  responseDeadline: string;
  hoursLeft: number;
  customerChoice: string | null;
  respondedAt: string | null;
  defaultApplied: boolean;
  resolution: string | null;
}

const TABS: { value: StatusFilter; label: string; tone: string }[] = [
  { value: 'PENDING', label: '대기 (72h)', tone: 'bg-yellow-100 text-yellow-900' },
  { value: 'EXPIRED', label: '만료', tone: 'bg-red-100 text-red-900' },
  { value: 'RESPONDED', label: '응답 완료', tone: 'bg-green-100 text-green-900' },
  { value: 'ALL', label: '전체', tone: 'bg-gray-100 text-gray-900' },
];

export default function InspectionsAdminPage() {
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inspections?status=${status}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setItems(body.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const applyChoice = async (id: string, choice: 'SHIP_AS_IS' | 'EXCHANGE' | 'REFUND') => {
    if (!confirm(`정말 ${choice} 로 처리합니까?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/inspections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      alert(`처리 실패: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">검수 큐 (Inspection 72h)</h1>
          <p className="text-sm text-gray-600">
            v2.0 Inspection 정책 — 문제 발견 시 고객에게 72h 응답 기회. 미응답 시 SHIP_AS_IS 자동 적용.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          새로고침
        </button>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map(tab => {
          const isActive = tab.value === status;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-[var(--pn-brand)] font-semibold text-[var(--pn-brand)]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-md border bg-white p-6 text-center text-sm text-gray-500">
          해당 상태의 항목이 없습니다.
        </p>
      )}

      <ul className="space-y-3">
        {items.map(item => (
          <InspectionRow
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onApply={applyChoice}
          />
        ))}
      </ul>
    </div>
  );
}

function InspectionRow({
  item,
  busy,
  onApply,
}: {
  item: InspectionItem;
  busy: boolean;
  onApply: (id: string, choice: 'SHIP_AS_IS' | 'EXCHANGE' | 'REFUND') => void;
}) {
  const isPending = !item.respondedAt;
  const isExpired = isPending && new Date(item.responseDeadline) < new Date();

  return (
    <li className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500">{item.id.slice(0, 8)}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
              Order {item.orderId.slice(0, 8)}
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-900">
              Seller {item.sellerCode}
            </span>
            {item.defaultApplied && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-900">
                Auto-default
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Notified {new Date(item.notifiedAt).toLocaleString()} · Deadline{' '}
            {new Date(item.responseDeadline).toLocaleString()}{' '}
            {isPending && !isExpired && (
              <span className="text-yellow-700">({item.hoursLeft}h 남음)</span>
            )}
            {isExpired && <span className="text-red-700">(EXPIRED)</span>}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-xs text-gray-500">현재 선택</p>
          <p className="font-medium">{item.customerChoice ?? '— 미응답'}</p>
        </div>
      </div>

      <details className="mt-3 rounded-md bg-gray-50 p-2 text-sm">
        <summary className="cursor-pointer text-gray-700">검수 결과 보기</summary>
        <pre className="mt-2 overflow-x-auto text-xs">{JSON.stringify(item.findings, null, 2)}</pre>
      </details>

      {item.resolution && (
        <p className="mt-2 rounded-md border-l-4 border-gray-300 bg-gray-50 p-2 text-xs text-gray-700">
          Resolution: {item.resolution}
        </p>
      )}

      {isPending && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply(item.id, 'SHIP_AS_IS')}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            그대로 발송 (SHIP_AS_IS)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply(item.id, 'EXCHANGE')}
            className="rounded-md bg-blue-100 px-3 py-1.5 text-sm text-blue-900 hover:bg-blue-200 disabled:opacity-50"
          >
            교환 (EXCHANGE)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply(item.id, 'REFUND')}
            className="rounded-md bg-red-100 px-3 py-1.5 text-sm text-red-900 hover:bg-red-200 disabled:opacity-50"
          >
            환불 (REFUND)
          </button>
        </div>
      )}
    </li>
  );
}
