'use client';

/**
 * PayNShip v2.1 — Order Detail (상세)
 */

import React from 'react';
import Link from 'next/link';
import { Price } from '@/components/currency/Price';
import { TimelineView, type TimelineStep } from './TimelineView';
import { HandoffButton } from './HandoffButton';
import { usePollingFetch } from '../application/usePollingFetch';

export interface OrderDetailData {
  id: string;
  status: string;
  currentStep: number;
  terminated: boolean;
  terminationKind?: 'cancelled' | 'failed';
  steps: TimelineStep[];
  order: {
    shopifyOrderId: string | null;
    shopifyOrderName: string | null;
    totalPrice: string | null;
    currencyCode: string;
    shippingCountry: string | null;
    lineItemCount: number;
    tags: string | null;
    receivedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { data, loading, error, lastFetchedAt } = usePollingFetch<OrderDetailData>({
    url: `/api/my-orders/${orderId}`,
  });

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="animate-pulse rounded-lg bg-gray-100 p-6">로딩 중...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          주문을 찾을 수 없어요. {error}
        </div>
        <Link href="/my-orders" className="mt-4 inline-block text-sm text-gray-600 hover:underline">
          ← 주문 목록으로
        </Link>
      </div>
    );
  }

  const priceNum = data.order.totalPrice ? Number(data.order.totalPrice) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-6">
        <Link href="/my-orders" className="text-sm text-gray-500 hover:underline">
          ← 주문 목록
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {data.order.shopifyOrderName ?? `주문 ${data.id.slice(0, 8)}`}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {formatDate(data.createdAt)} · {data.order.lineItemCount}개 상품
          {data.order.shippingCountry && ` · ${data.order.shippingCountry} 배송`}
        </p>
      </div>

      {/* Timeline */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-lg font-semibold">진행 상태</h2>
        <TimelineView
          steps={data.steps}
          terminationKind={data.terminationKind}
        />
      </section>

      {/* Order Info */}
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">주문 정보</h2>
        <dl className="space-y-2 text-sm">
          <Row label="Shopify 주문 번호" value={data.order.shopifyOrderName ?? '—'} />
          <Row label="상품 수" value={`${data.order.lineItemCount}개`} />
          <Row label="배송지 국가" value={data.order.shippingCountry ?? '—'} />
          <Row label="주문일" value={formatDate(data.createdAt)} />
          {priceNum != null && (
            <Row
              label="결제액"
              valueNode={<Price usd={priceNum} size="sm" usdOnly />}
            />
          )}
        </dl>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400">
        30초마다 자동 갱신
        {lastFetchedAt && ` · 마지막 업데이트: ${formatTime(lastFetchedAt.toISOString())}`}
      </div>

      {/* CS */}
      <div className="mt-8 space-y-3">
        <HandoffButton orderId={data.id} />
        <Link
          href={`/?topic=order&orderId=${data.id}`}
          className="block rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-center text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        >
          💬 이 주문 관련 채팅 문의
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, valueNode }: { label: string; value?: string; valueNode?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium">{valueNode ?? value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
