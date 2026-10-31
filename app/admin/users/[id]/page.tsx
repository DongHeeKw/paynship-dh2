'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserPreferences {
  id: string;
  defaultCountry: string | null;
  language: string | null;
  favoriteCategories: string | null;
  pricePreference: string | null;
  llmNotes: string | null;
}

interface UserDetail {
  id: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  preferences: UserPreferences | null;
  stats: {
    sessionCount: number;
    orderCount: number;
    totalSpent: number;
  };
}

interface Session {
  id: string;
  title: string | null;
  startTime: string;
  lastActive: string;
  messageCount: number;
}

interface Order {
  id: string;
  status: string;
  createdAt: string;
  totalUsd: number;
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/admin/users/${id}`);
        if (!response.ok) throw new Error('Failed to fetch user');

        const data = await response.json();
        setUser(data.user);
        setSessions(data.recentSessions);
        setOrders(data.orders);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [id]);

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

  // Order status badge
  const OrderStatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      PAID: 'bg-green-100 text-green-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      SHIPPED: 'bg-purple-100 text-purple-700',
      DELIVERED: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700',
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          colors[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-48" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 rounded-xl" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자를 찾을 수 없습니다</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-purple-600 hover:underline"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left text-gray-600"></i>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {user.email}
              {user.isAdmin && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  Admin
                </span>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              가입일: {new Date(user.createdAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">기본 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">이메일</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">연락처</span>
              <span className="font-medium">{user.phone || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">가입일</span>
              <span className="font-medium">
                {new Date(user.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">마지막 활동</span>
              <span className="font-medium">
                {formatRelativeTime(user.lastActiveAt)}
              </span>
            </div>
          </div>
        </div>

        {/* User Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">선호 설정</h2>
          {user.preferences ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">배송 국가</span>
                <span className="font-medium">
                  {user.preferences.defaultCountry || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">언어</span>
                <span className="font-medium">
                  {user.preferences.language || 'auto'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">선호 카테고리</span>
                <span className="font-medium">
                  {user.preferences.favoriteCategories || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">가격 선호</span>
                <span className="font-medium">
                  {user.preferences.pricePreference || '-'}
                </span>
              </div>
              {user.preferences.llmNotes && (
                <div className="pt-2">
                  <span className="text-gray-500 text-sm">LLM 메모</span>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg">
                    {user.preferences.llmNotes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">선호 설정이 없습니다</p>
          )}
        </div>

        {/* Activity Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">활동 요약</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {user.stats.sessionCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">총 대화</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {user.stats.orderCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">총 주문</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                ${user.stats.totalSpent.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">총 결제</p>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">최근 대화</h2>
            <Link
              href={`/admin/conversations?userId=${user.id}`}
              className="text-purple-600 text-sm hover:underline"
            >
              전체 보기 →
            </Link>
          </div>
          {sessions.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/admin/conversations/${session.id}`}
                  className="block p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs text-gray-500">
                        {session.id.substring(0, 8)}...
                      </p>
                      {session.title && (
                        <p className="text-sm text-gray-700 mt-0.5">
                          {session.title}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {formatRelativeTime(session.lastActive)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {session.messageCount}개 메시지
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">대화 이력이 없습니다</p>
          )}
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">주문 이력</h2>
          <Link
            href={`/admin/orders?userId=${user.id}`}
            className="text-purple-600 text-sm hover:underline"
          >
            전체 보기 →
          </Link>
        </div>
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    주문 ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    주문일
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    금액
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">
                        #{order.id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      ${order.totalUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">주문 이력이 없습니다</p>
        )}
      </div>
    </div>
  );
}
