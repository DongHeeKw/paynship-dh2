'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DataTable, { type Column } from '@/components/admin/tables/DataTable';
import Pagination from '@/components/admin/tables/Pagination';
import { OrderStatusBadge } from '@/components/common';

const ORDER_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'PENDING_PAYMENT', label: '결제 대기' },
  { value: 'PURCHASED', label: '구매 완료' },
  { value: 'PURCHASE_FAILED', label: '구매 실패' },
  { value: 'WAREHOUSE_RECEIVED', label: '창고 입고' },
  { value: 'PENDING_SHIPPING_PAYMENT', label: '배송비 결제 대기' },
  { value: 'SHIPPING_PAYMENT_OVERDUE', label: '배송비 결제 연체' },
  { value: 'SHIPPING', label: '배송중' },
  { value: 'CUSTOMS_CLEARANCE', label: '통관중' },
  { value: 'DELIVERING', label: '배달중' },
  { value: 'DELIVERED', label: '배달 완료' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELLED', label: '취소됨' },
  { value: 'REFUND_PENDING', label: '환불 대기' },
  { value: 'PENDING', label: '대기 (레거시)' },
];

interface StuckOrder {
  id: string;
  status: string;
  stuckReason: string;
  stuckHours: number;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StuckOrdersData {
  orders: StuckOrder[];
  total: number;
}

interface Order {
  id: string;
  userId: string | null;
  status: string;
  totalUsd: number;
  itemCount: number;
  shippingCountry: string | null;
  trackingNumber: string | null;
  isDemo: boolean;
  productName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    userId: searchParams.get('userId') || '',
    mode: searchParams.get('mode') || 'real',
    search: searchParams.get('search') || '',
  });
  const [stuckOrders, setStuckOrders] = useState<StuckOrdersData | null>(null);
  const [stuckLoading, setStuckLoading] = useState(true);

  const fetchStuckOrders = useCallback(async () => {
    try {
      setStuckLoading(true);
      const response = await fetch('/api/admin/orders/stuck');
      if (response.ok) {
        const data = await response.json();
        setStuckOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch stuck orders:', error);
    } finally {
      setStuckLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      });

      if (filters.status) params.set('status', filters.status);
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.mode) params.set('mode', filters.mode);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/admin/orders?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchStuckOrders();
  }, [fetchStuckOrders]);

  const handleRowClick = (order: Order) => {
    router.push(`/admin/orders/${order.id}`);
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: '주문번호',
      render: (order) => (
        <span className="font-mono text-xs text-gray-500">
          {order.id.slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'user',
      header: '고객',
      render: (order) => (
        <span className={order.userId ? 'text-gray-900' : 'text-gray-400 italic'}>
          {order.userId ? order.userId.slice(0, 16) : 'Guest'}
        </span>
      ),
    },
    {
      key: 'product',
      header: '상품',
      render: (order) => (
        <div className="max-w-[150px]">
          <span className="text-gray-900 truncate block">
            {order.productName || `${order.itemCount}개 상품`}
          </span>
          {order.isDemo && (
            <span className="inline-flex mt-1 items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              DEMO
            </span>
          )}
          {order.itemCount > 1 && order.productName && (
            <span className="text-xs text-gray-500">외 {order.itemCount - 1}개</span>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: '금액',
      render: (order) => (
        <div className="font-medium text-gray-900">
          ${order.totalUsd.toFixed(2)}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (order) => <OrderStatusBadge status={order.status} />,
    },
    {
      key: 'shipping',
      header: '배송',
      render: (order) => (
        <div className="text-sm">
          {order.shippingCountry && (
            <span className="text-gray-600">{order.shippingCountry}</span>
          )}
          {order.trackingNumber && (
            <div className="text-xs text-purple-600 font-mono">
              {order.trackingNumber}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: '주문일',
      render: (order) => (
        <span className="text-gray-500 text-xs">
          {new Date(order.createdAt).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
        <button
          onClick={() => { fetchOrders(); fetchStuckOrders(); }}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <i className="fas fa-sync-alt"></i>
          <span>새로고침</span>
        </button>
      </div>

      {/* Stuck Orders Alert */}
      {!stuckLoading && stuckOrders && stuckOrders.total > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-exclamation-triangle text-red-500"></i>
            <h2 className="text-sm font-bold text-red-800">
              처리 지연 주문 {stuckOrders.total}건 — 즉각 확인 필요
            </h2>
          </div>
          <div className="space-y-2">
            {stuckOrders.orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => router.push(`/admin/orders/${order.id}`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-gray-400">{order.id.slice(0, 8)}...</span>
                  <OrderStatusBadge status={order.status} />
                  <span className="text-sm text-gray-700 truncate">{order.productName || '상품명 없음'}</span>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className="text-xs text-red-600 font-medium">{order.stuckReason}</span>
                  <span className="text-xs text-gray-400">{order.stuckHours}시간 경과</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">검색:</label>
            <input
              type="text"
              placeholder="상품명, URL, 이메일..."
              value={filters.search}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, search: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-52"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">상태:</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, status: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">모드:</label>
            <select
              value={filters.mode}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, mode: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="real">실주문만</option>
              <option value="demo">데모만</option>
              <option value="all">전체</option>
            </select>
          </div>

          {/* Date filters */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">기간:</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, from: e.target.value }))
              }
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, to: e.target.value }))
              }
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Clear filters */}
          {(filters.status || filters.from || filters.to || filters.userId || filters.mode !== 'real' || filters.search) && (
            <button
              onClick={() =>
                setFilters({ status: '', from: '', to: '', userId: '', mode: 'real', search: '' })
              }
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              필터 초기화
            </button>
          )}
        </div>
        {filters.userId && (
          <p className="mt-3 text-xs text-gray-500">
            사용자 필터 적용 중:
            <span className="ml-2 font-mono text-gray-700">{filters.userId}</span>
          </p>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        onRowClick={handleRowClick}
        rowKey={(order) => order.id}
        emptyMessage="주문 내역이 없습니다"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

function OrdersLoadingFallback() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-100 rounded animate-pulse w-48" />
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersLoadingFallback />}>
      <OrdersContent />
    </Suspense>
  );
}
