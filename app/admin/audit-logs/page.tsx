'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DataTable, { Column } from '@/components/admin/tables/DataTable';
import Pagination from '@/components/admin/tables/Pagination';

interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

interface AuditLogItem {
  id: string;
  action: string;
  target: string;
  targetId: string | null;
  adminUserId: string | null;
  adminUserEmail: string | null;
  changes: unknown;
  requestMeta: unknown;
  createdAt: string;
}

interface AuditLogsResponse {
  logs: AuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });

      if (actionFilter) {
        params.set('action', actionFilter);
      }

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch audit logs: ${response.status}`);
      }

      const data = await response.json() as AuditLogsResponse;
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = useMemo<Column<AuditLogItem>[]>(() => [
    {
      key: 'createdAt',
      header: '시간',
      render: (item) => (
        <span className="text-xs text-gray-500">
          {new Date(item.createdAt).toLocaleString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'action',
      header: '액션',
      render: (item) => (
        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
          {item.action}
        </span>
      ),
    },
    {
      key: 'target',
      header: '대상',
      render: (item) => (
        <span className="font-mono text-xs text-gray-700">{item.target}</span>
      ),
    },
    {
      key: 'actor',
      header: '수행자',
      render: (item) => (
        <div>
          <p className="text-sm text-gray-900">{item.adminUserEmail || 'unknown'}</p>
          {item.adminUserId && (
            <p className="text-xs text-gray-400 font-mono">{item.adminUserId.slice(0, 8)}...</p>
          )}
        </div>
      ),
    },
    {
      key: 'changes',
      header: '변경 필드',
      render: (item) => {
        const changes = toFieldChanges(item.changes);
        if (changes.length === 0) {
          return <span className="text-xs text-gray-400">-</span>;
        }

        const fields = changes.map((change) => change.field);
        return (
          <div>
            <p className="text-sm text-gray-900">{changes.length}개 필드</p>
            <p className="text-xs text-gray-500 truncate max-w-[220px]">
              {fields.join(', ')}
            </p>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">설정 감사 로그</h1>
          <p className="text-sm text-gray-500 mt-1">
            관리자 설정 변경 이력과 요청 메타데이터를 확인합니다.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <i className="fas fa-sync-alt"></i>
          새로고침
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-500">액션 필터</label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">전체</option>
            <option value="UPDATE_ADMIN_SETTINGS">UPDATE_ADMIN_SETTINGS</option>
          </select>
          {actionFilter && (
            <button
              onClick={() => {
                setActionFilter('');
                setPage(1);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        emptyMessage="감사 로그가 없습니다"
        onRowClick={(item) => setSelectedLog(item)}
        rowKey={(item) => item.id}
      />

      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={setPage}
        />
      )}

      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

function AuditLogDetailModal({
  log,
  onClose,
}: {
  log: AuditLogItem;
  onClose: () => void;
}) {
  const changes = toFieldChanges(log.changes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl border border-gray-200 shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">감사 로그 상세</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <InfoRow label="시간" value={new Date(log.createdAt).toLocaleString('ko-KR')} />
            <InfoRow label="액션" value={log.action} />
            <InfoRow label="대상" value={log.target} />
            <InfoRow label="수행자" value={log.adminUserEmail || '-'} />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">변경 필드</p>
            {changes.length === 0 ? (
              <p className="text-sm text-gray-500">변경 필드 정보가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {changes.map((change) => (
                  <div key={change.field} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm font-mono text-gray-900">{change.field}</p>
                    <div className="mt-1 text-xs text-gray-500">
                      <p>before: {toInlineString(change.before)}</p>
                      <p>after: {toInlineString(change.after)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">요청 메타데이터</p>
            <pre className="p-3 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto">
              {JSON.stringify(log.requestMeta || {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function toFieldChanges(value: unknown): FieldChange[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is FieldChange => {
    if (!item || typeof item !== 'object') return false;
    const record = item as Record<string, unknown>;
    return typeof record.field === 'string' && 'before' in record && 'after' in record;
  });
}

function toInlineString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '-';
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}
