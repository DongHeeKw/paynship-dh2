'use client';

/**
 * PayNShip v2.1 — Order Card (목록)
 *
 * ProcurementTask 1개를 카드로 표현.
 */

import React from 'react';
import Link from 'next/link';
import { Price } from '@/components/currency/Price';

export interface OrderCardData {
  id: string;
  shopifyOrderName: string | null;
  status: string;
  currentStep: number;
  statusSummary: string;
  terminated: boolean;
  terminationKind?: 'cancelled' | 'failed';
  totalPrice: string | null;
  currencyCode: string;
  lineItemCount: number;
  shippingCountry: string | null;
  createdAt: string;
}

export function OrderCard({ data }: { data: OrderCardData }) {
  const priceNum = data.totalPrice ? Number(data.totalPrice) : null;

  return (
    <Link
      href={`/my-orders/${data.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 transition hover:border-gray-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-0.5 text-xs text-gray-500">
            {data.shopifyOrderName ?? `주문 ${data.id.slice(0, 8)}`}
          </div>
          <div className="truncate font-semibold">
            {data.statusSummary}
          </div>
        </div>
        <StatusBadge terminated={data.terminated} kind={data.terminationKind} step={data.currentStep} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span>{data.lineItemCount}개 상품</span>
        {data.shippingCountry && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <FlagEmoji iso={data.shippingCountry} />
              {data.shippingCountry}
            </span>
          </>
        )}
        <span>·</span>
        <span>{formatRelativeDate(data.createdAt)}</span>
      </div>

      {!data.terminated && (
        <StepProgress currentStep={data.currentStep} />
      )}

      {priceNum != null && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-500">결제액</span>
          <Price usd={priceNum} size="sm" usdOnly />
        </div>
      )}
    </Link>
  );
}

function StatusBadge({
  terminated,
  kind,
  step,
}: {
  terminated: boolean;
  kind?: 'cancelled' | 'failed';
  step: number;
}) {
  if (terminated) {
    return (
      <span className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
        kind === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700'
      }`}>
        {kind === 'cancelled' ? '취소' : '오류'}
      </span>
    );
  }
  if (step >= 9) {
    return (
      <span className="flex-shrink-0 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
        완료
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
      진행중
    </span>
  );
}

function StepProgress({ currentStep }: { currentStep: number }) {
  const pct = Math.min(100, Math.max(0, (currentStep / 9) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>단계 {currentStep}/9</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full bg-[var(--pn-brand)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FlagEmoji({ iso }: { iso: string }) {
  if (iso?.length !== 2) return null;
  const codePoints = iso.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return <span>{String.fromCodePoint(...codePoints)}</span>;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 1) return '방금 전';
  if (diffH < 24) return `${Math.floor(diffH)}시간 전`;
  const diffD = diffH / 24;
  if (diffD < 7) return `${Math.floor(diffD)}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}
