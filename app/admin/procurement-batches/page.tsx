'use client';

import { useCallback, useEffect, useState } from 'react';

type ProcurementBatchStatus =
  | 'draft'
  | 'queued'
  | 'sourcing'
  | 'approved'
  | 'purchased'
  | 'partially_purchased'
  | 'cancelled';

interface ProcurementBatch {
  id: string;
  status: ProcurementBatchStatus;
  sourceVendor: string | null;
  selectedSourceUrl: string | null;
  orderIntentIds: string[];
  operatorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface ProcurementTask {
  id: string;
  batchId: string | null;
  orderIntentId: string | null;
  canonicalProductId: string | null;
  status: string;
  selectedSourceUrl: string | null;
  lowestPriceKrw: number | null;
  availabilityStatus: string | null;
  reviewSummary: string | null;
  createdAt: string;
}

function statusTone(status: ProcurementBatchStatus): string {
  switch (status) {
    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'purchased':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'partially_purchased':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'cancelled':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'sourcing':
      return 'border-purple-200 bg-purple-50 text-purple-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

export default function ProcurementBatchesPage() {
  const [batches, setBatches] = useState<ProcurementBatch[]>([]);
  const [tasks, setTasks] = useState<ProcurementTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/procurement-batches');
      if (!res.ok) throw new Error('Failed to fetch procurement batches');
      const data = await res.json();
      setBatches(data.batches || []);

      const taskRes = await fetch('/api/admin/procurement-tasks');
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTasks(taskData.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch procurement batches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const updateBatch = async (batchId: string, status: ProcurementBatchStatus) => {
    try {
      setSavingId(batchId);
      const res = await fetch(`/api/admin/procurement-batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Failed to update procurement batch');
      }
      await fetchBatches();
    } catch (error) {
      console.error('Failed to update procurement batch:', error);
      alert(error instanceof Error ? error.message : '구매 배치 업데이트에 실패했습니다');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">구매 배치</h1>
          <p className="mt-1 text-sm text-gray-500">
            수락된 주문 요청을 실제 한국측 구매 단위로 묶고 진행 상태를 관리합니다.
          </p>
        </div>
        <button
          onClick={fetchBatches}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
          로딩 중...
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          아직 생성된 구매 배치가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => (
            <div key={batch.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              {(() => {
                const batchTasks = tasks.filter((task) => task.batchId === batch.id);
                return (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${statusTone(batch.status)}`}>
                      {batch.status}
                    </span>
                    <span className="font-mono text-xs text-gray-500">{batch.id}</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
                    <div>vendor: <span className="font-medium">{batch.sourceVendor || '-'}</span></div>
                    <div>operator: <span className="font-medium">{batch.operatorUserId || '-'}</span></div>
                    <div>linked intents: <span className="font-medium">{batch.orderIntentIds.length}</span></div>
                    <div>updated: <span className="font-medium">{new Date(batch.updatedAt).toLocaleString('ko-KR')}</span></div>
                  </div>

                  {batch.selectedSourceUrl && (
                    <p className="text-sm text-gray-600 break-all">selected source: {batch.selectedSourceUrl}</p>
                  )}

                  {batch.orderIntentIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {batch.orderIntentIds.map((intentId) => (
                        <span
                          key={`${batch.id}-${intentId}`}
                          className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-mono text-gray-600"
                        >
                          {intentId}
                        </span>
                      ))}
                    </div>
                  )}

                  {batch.metadata && (
                    <details className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">metadata</summary>
                      <pre className="mt-3 overflow-x-auto text-xs text-gray-600">
                        {JSON.stringify(batch.metadata, null, 2)}
                      </pre>
                    </details>
                  )}

                  {batchTasks.length > 0 && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-800">linked tasks</p>
                      <div className="mt-2 space-y-2">
                        {batchTasks.map((task) => (
                          <div key={task.id} className="rounded-lg border border-white bg-white px-3 py-2 text-sm text-gray-700">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-gray-500">{task.id}</span>
                              <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                                {task.status}
                              </span>
                              {task.availabilityStatus && (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                  {task.availabilityStatus}
                                </span>
                              )}
                            </div>
                            {(task.selectedSourceUrl || task.lowestPriceKrw || task.reviewSummary) && (
                              <div className="mt-1 text-xs text-gray-500">
                                {task.selectedSourceUrl && <div>source: {task.selectedSourceUrl}</div>}
                                {typeof task.lowestPriceKrw === 'number' && <div>lowest price: ₩{task.lowestPriceKrw.toLocaleString()}</div>}
                                {task.reviewSummary && <div>summary: {task.reviewSummary}</div>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {(['queued', 'sourcing', 'approved', 'purchased', 'partially_purchased', 'cancelled'] as ProcurementBatchStatus[]).map((status) => (
                    <button
                      key={`${batch.id}-${status}`}
                      onClick={() => updateBatch(batch.id, status)}
                      disabled={savingId === batch.id || batch.status === status}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
