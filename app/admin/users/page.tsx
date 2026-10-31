'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '@/components/admin/tables/DataTable';
import Pagination from '@/components/admin/tables/Pagination';
import { Badge, UserStatusBadge } from '@/components/common';

interface User {
  id: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  sessionCount: number;
  orderCount: number;
  totalSpent: number;
  preferences: {
    defaultCountry: string | null;
    language: string | null;
  } | null;
}

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasOrdersFilter, setHasOrdersFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (hasOrdersFilter) params.set('hasOrders', hasOrdersFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, hasOrdersFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Format relative time
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const columns: Column<User>[] = [
    {
      key: 'email',
      header: '이메일',
      render: (user) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{user.email}</span>
          {user.isAdmin && <Badge variant="purple" size="sm">Admin</Badge>}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: '가입일',
      render: (user) => (
        <span className="text-gray-500 text-sm">
          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'lastActiveAt',
      header: '마지막 활동',
      render: (user) => (
        <span className="text-gray-500 text-sm">
          {formatRelativeTime(user.lastActiveAt)}
        </span>
      ),
    },
    {
      key: 'sessionCount',
      header: '대화 수',
      render: (user) => (
        <span className="text-sm">{user.sessionCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'orderCount',
      header: '주문 수',
      render: (user) => (
        <span className="text-sm">{user.orderCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'totalSpent',
      header: '총 결제액',
      render: (user) => (
        <span className="font-medium text-sm">
          ${user.totalSpent.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      render: (user) => <UserStatusBadge lastActiveAt={user.lastActiveAt} />,
    },
  ];

  const handleRowClick = (user: User) => {
    router.push(`/admin/users/${user.id}`);
  };

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setHasOrdersFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
        <p className="text-gray-500 text-sm mt-1">
          등록된 사용자를 조회하고 활동 현황을 파악합니다
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 font-medium">총 사용자</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {pagination.total.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 font-medium">활성 사용자</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {users.filter((u) => {
              if (!u.lastActiveAt) return false;
              const diffDays = Math.floor(
                (Date.now() - new Date(u.lastActiveAt).getTime()) / 86400000
              );
              return diffDays <= 7;
            }).length}
          </p>
          <p className="text-xs text-gray-400 mt-1">7일 이내</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 font-medium">주문 사용자</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {users.filter((u) => u.orderCount > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm text-gray-500 font-medium">평균 결제액</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">
            $
            {users.length > 0
              ? (
                  users.reduce((sum, u) => sum + u.totalSpent, 0) / users.length
                ).toFixed(2)
              : '0.00'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">이메일 검색</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="user@example.com"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">활동 상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">전체</option>
              <option value="active">활성 (7일 내)</option>
              <option value="dormant">휴면 (30일+)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">주문 이력</label>
            <select
              value={hasOrdersFilter}
              onChange={(e) => setHasOrdersFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">전체</option>
              <option value="true">있음</option>
              <option value="false">없음</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">가입일</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
          >
            <i className="fas fa-search mr-1"></i>
            검색
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        rowKey={(user) => user.id}
        onRowClick={handleRowClick}
        emptyMessage="사용자가 없습니다"
      />

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
