'use client';

import { useCallback, useEffect, useState } from 'react';
import DataTable, { type Column } from '@/components/admin/tables/DataTable';
import Pagination from '@/components/admin/tables/Pagination';

interface WebhookLog {
  id: string;
  webhookId: string | null;
  topic: string;
  shopDomain: string | null;
  shopifyOrderId: string | null;
  quoteId: string | null;
  correlationStatus: string;
  processingStatus: string;
  httpStatus: number | null;
  processingMs: number | null;
  errorMessage: string | null;
  payload: unknown;
  createdAt: string;
  processedAt: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminShopifyWebhooksPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [processingStatus, setProcessingStatus] = useState('');
  const [correlationStatus, setCorrelationStatus] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });
      if (processingStatus) params.set('processingStatus', processingStatus);
      if (correlationStatus) params.set('correlationStatus', correlationStatus);

      const response = await fetch(`/api/admin/shopify/webhooks?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch webhook logs');

      const data = await response.json();
      setLogs(data.logs || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, processingStatus, correlationStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: Column<WebhookLog>[] = [
    {
      key: 'createdAt',
      header: '수신시각',
      render: (item) => (
        <span className="text-xs text-gray-500">
          {new Date(item.createdAt).toLocaleString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'topic',
      header: '토픽',
      render: (item) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{item.topic}</span>
      ),
    },
    {
      key: 'correlationStatus',
      header: '상관관계',
      render: (item) => (
        <span className="text-xs text-gray-700">{item.correlationStatus}</span>
      ),
    },
    {
      key: 'processingStatus',
      header: '처리결과',
      render: (item) => (
        <span className={`text-xs font-medium ${
          item.processingStatus === 'SUCCESS' ? 'text-green-700' : 'text-red-600'
        }`}>
          {item.processingStatus}
        </span>
      ),
    },
    {
      key: 'shopifyOrderId',
      header: 'Shopify Order',
      render: (item) => (
        <span className="font-mono text-xs text-gray-600">
          {item.shopifyOrderId || '-'}
        </span>
      ),
    },
    {
      key: 'quoteId',
      header: 'Quote',
      render: (item) => (
        <span className="font-mono text-xs text-gray-600">
          {item.quoteId ? `${item.quoteId.slice(0, 8)}...` : '-'}
        </span>
      ),
    },
    {
      key: 'httpStatus',
      header: 'HTTP',
      render: (item) => (
        <span className="text-xs text-gray-700">{item.httpStatus ?? '-'}</span>
      ),
    },
    {
      key: 'processingMs',
      header: '처리시간',
      render: (item) => (
        <span className="text-xs text-gray-700">{item.processingMs ? `${item.processingMs}ms` : '-'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopify Webhook 진단</h1>
          <p className="text-sm text-gray-500 mt-1">
            결제/배송 웹훅 수신 이력과 quote 상관관계 상태를 확인합니다.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          새로고침
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">처리결과</label>
            <select
              value={processingStatus}
              onChange={(e) => {
                setProcessingStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">전체</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">상관관계</label>
            <select
              value={correlationStatus}
              onChange={(e) => {
                setCorrelationStatus(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg"
            >
              <option value="">전체</option>
              <option value="CORRELATED">CORRELATED</option>
              <option value="MISSING_QUOTE_ID">MISSING_QUOTE_ID</option>
              <option value="QUOTE_NOT_FOUND">QUOTE_NOT_FOUND</option>
              <option value="ORDER_NOT_FOUND">ORDER_NOT_FOUND</option>
              <option value="UNHANDLED_TOPIC">UNHANDLED_TOPIC</option>
            </select>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        rowKey={(item) => item.id}
        emptyMessage="Webhook 이력이 없습니다"
      />

      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={(newPage) => setPagination((prev) => ({ ...prev, page: newPage }))}
        />
      )}
    </div>
  );
}
