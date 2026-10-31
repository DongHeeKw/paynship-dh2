'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type HealthStatus = 'ok' | 'warning' | 'error' | 'skipped';

interface EnvVarCheck {
  key: string;
  required: boolean;
  configured: boolean;
  category: string;
  note: string;
}

interface ServiceCheck {
  key: string;
  label: string;
  status: HealthStatus;
  message: string;
  latencyMs?: number;
}

interface EnvHealthResponse {
  summary: {
    env: {
      total: number;
      configured: number;
      required: number;
      missingRequired: number;
    };
    services: {
      total: number;
      ok: number;
      warning: number;
      error: number;
      skipped: number;
    };
  };
  envChecks: EnvVarCheck[];
  serviceChecks: ServiceCheck[];
  timestamp: string;
}

export default function AdminEnvHealthPage() {
  const [data, setData] = useState<EnvHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/env-health');
      if (!response.ok) {
        throw new Error(`Failed to fetch env health: ${response.status}`);
      }

      const json = await response.json() as EnvHealthResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const statusBadgeClasses = useMemo<Record<HealthStatus, string>>(() => ({
    ok: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    skipped: 'bg-gray-100 text-gray-700 border-gray-200',
  }), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <i className="fas fa-spinner fa-spin"></i>
          <span>환경 진단 데이터를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error || '환경 진단 데이터를 불러오지 못했습니다'}
        </div>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const missingRequired = data.envChecks.filter((item) => item.required && !item.configured);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">환경 진단</h1>
          <p className="text-sm text-gray-500 mt-1">
            필수 환경값과 운영 서비스 연결 상태를 한 번에 점검합니다.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <i className="fas fa-sync-alt"></i>
          새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="필수 환경값 누락"
          value={data.summary.env.missingRequired}
          tone={data.summary.env.missingRequired > 0 ? 'error' : 'ok'}
        />
        <SummaryCard
          title="환경값 설정률"
          value={`${Math.round((data.summary.env.configured / Math.max(1, data.summary.env.total)) * 100)}%`}
          tone="neutral"
        />
        <SummaryCard
          title="서비스 오류"
          value={data.summary.services.error}
          tone={data.summary.services.error > 0 ? 'error' : 'ok'}
        />
        <SummaryCard
          title="서비스 경고"
          value={data.summary.services.warning}
          tone={data.summary.services.warning > 0 ? 'warning' : 'ok'}
        />
      </div>

      {missingRequired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">
            필수 환경값 누락
          </p>
          <div className="flex flex-wrap gap-2">
            {missingRequired.map((item) => (
              <span
                key={item.key}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-red-200 text-red-700 text-xs font-mono"
              >
                {item.key}
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">서비스 상태</h2>
        </div>
        <div className="p-5 space-y-3">
          {data.serviceChecks.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{item.message}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {item.latencyMs !== undefined && (
                  <span className="text-xs text-gray-500 font-mono">
                    {item.latencyMs}ms
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusBadgeClasses[item.status]}`}
                >
                  {item.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">환경값 체크</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">KEY</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">구분</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">필수 여부</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">상태</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.envChecks.map((item) => (
                <tr key={item.key}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-800">{item.key}</td>
                  <td className="px-4 py-3 text-gray-700">{item.category}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${item.required ? 'text-red-600' : 'text-gray-500'}`}>
                      {item.required ? 'required' : 'optional'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full border ${
                        item.configured
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : item.required
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {item.configured ? 'configured' : 'missing'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-gray-400">
        마지막 점검: {new Date(data.timestamp).toLocaleString('ko-KR')}
      </p>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number | string;
  tone: 'ok' | 'warning' | 'error' | 'neutral';
}) {
  const toneClasses: Record<typeof tone, string> = {
    ok: 'text-green-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
    neutral: 'text-gray-900',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}
