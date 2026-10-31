'use client';

import React from 'react';
import Link from 'next/link';
import { usePollingFetch } from '../application/usePollingFetch';
import { OrderCard, type OrderCardData } from './OrderCard';

interface ListResponse {
  items: OrderCardData[];
  count: number;
}

export function MyOrdersClient() {
  const { data, loading, error } = usePollingFetch<ListResponse>({
    url: '/api/my-orders',
    intervalMs: 30_000,
  });

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        주문을 불러올 수 없어요: {error}
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <div className="mb-3 text-5xl">📦</div>
        <h2 className="mb-2 text-lg font-semibold">아직 주문이 없어요</h2>
        <p className="mb-6 text-sm text-gray-500">
          채팅으로 원하는 상품을 찾고 간편하게 주문해보세요.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-[var(--pn-brand)] px-5 py-2.5 font-semibold text-white hover:brightness-110"
        >
          쇼핑 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <OrderCard key={item.id} data={item} />
      ))}
      <p className="pt-4 text-center text-xs text-gray-400">
        30초마다 자동 갱신 · 총 {data?.count ?? 0}건
      </p>
    </div>
  );
}
