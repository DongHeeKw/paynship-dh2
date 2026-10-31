'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { OrderPriceBreakdown } from '@/lib/admin/types';
import { useAdminRole } from '@/hooks/useAdminRole';

interface OrderItem {
  id: string;
  name: string;
  imageUrl: string | null;
  priceKrw: number;
  quantity: number;
  options: Record<string, string> | null;
  sourceUrl: string | null;
}

interface OrderDetail {
  id: string;
  quoteId: string;
  userId: string | null;
  status: string;
  totalUsd: number;
  shippingCountry: string | null;
  shippingAddress: Record<string, string> | null;
  trackingNumber: string | null;
  isDemo: boolean;
  shopifyOrderId: string | null;
  shopifyFulfillmentId: string | null;
  createdAt: string;
  updatedAt: string;
  priceBreakdown: OrderPriceBreakdown;
  items: OrderItem[];
}

interface ShipmentData {
  id: string;
  carrier: string;
  trackingNumber: string;
  status: string;
  events?: Array<{ status: string; description: string; location?: string; timestamp: string }>;
}

interface RefundData {
  id: string;
  reason: string;
  amount: number | null;
  status: string;
  createdAt: string;
}

// Full 14-status enum from Prisma schema
const STATUS_OPTIONS = [
  { value: 'PENDING_PAYMENT', label: '결제 대기' },
  { value: 'PURCHASED', label: '구매 완료' },
  { value: 'PURCHASE_FAILED', label: '구매 실패' },
  { value: 'WAREHOUSE_RECEIVED', label: '입고 완료' },
  { value: 'PENDING_SHIPPING_PAYMENT', label: '배송비 결제 대기' },
  { value: 'SHIPPING_PAYMENT_OVERDUE', label: '배송비 결제 기한 초과' },
  { value: 'SHIPPING', label: '국제 배송 중' },
  { value: 'CUSTOMS_CLEARANCE', label: '통관 중' },
  { value: 'DELIVERING', label: '현지 배송 중' },
  { value: 'DELIVERED', label: '배송 완료' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'CANCELLED', label: '취소됨' },
  { value: 'REFUND_PENDING', label: '환불 처리 중' },
  // Legacy compat
  { value: 'PENDING', label: '대기 (레거시)' },
  { value: 'PAID', label: '결제완료 (레거시)' },
  { value: 'PROCESSING', label: '처리중 (레거시)' },
  { value: 'SHIPPED', label: '배송중 (레거시)' },
];

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REFUND_PENDING'];

function StatusBadge({ status }: { status: string }) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);
  const label = opt?.label ?? status;
  const colorMap: Record<string, string> = {
    PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
    PURCHASED: 'bg-blue-100 text-blue-800',
    PURCHASE_FAILED: 'bg-red-100 text-red-800',
    WAREHOUSE_RECEIVED: 'bg-indigo-100 text-indigo-800',
    PENDING_SHIPPING_PAYMENT: 'bg-orange-100 text-orange-800',
    SHIPPING_PAYMENT_OVERDUE: 'bg-red-100 text-red-800',
    SHIPPING: 'bg-purple-100 text-purple-800',
    CUSTOMS_CLEARANCE: 'bg-violet-100 text-violet-800',
    DELIVERING: 'bg-cyan-100 text-cyan-800',
    DELIVERED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-200 text-green-900',
    CANCELLED: 'bg-gray-100 text-gray-800',
    REFUND_PENDING: 'bg-rose-100 text-rose-800',
    PENDING: 'bg-yellow-50 text-yellow-700',
    PAID: 'bg-blue-50 text-blue-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-purple-50 text-purple-700',
  };
  const cls = colorMap[status] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

// Collapsible section wrapper
function OpsSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
          <i className={`fas ${icon} text-purple-500`}></i>
          {title}
        </span>
        <i className={`fas fa-chevron-${open ? 'up' : 'down'} text-gray-400 text-xs`}></i>
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  const bg = type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800';
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${bg}`}>
      <i className={`fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2`}></i>
      {message}
    </div>
  );
}

// ============================================================================
// Warehouse Intake Section
// ============================================================================
function WarehouseSection({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({
    actualWeightKg: '',
    l: '',
    w: '',
    h: '',
    warehouseNotes: '',
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [discrepancy, setDiscrepancy] = useState<{
    estimatedShippingUsd: number | null;
    actualShippingUsd: number;
    diffPercent: number | null;
    flagged: boolean;
  } | null>(null);

  const handleSubmit = async () => {
    const weight = parseFloat(form.actualWeightKg);
    const l = parseFloat(form.l);
    const w = parseFloat(form.w);
    const h = parseFloat(form.h);
    if (!weight || !l || !w || !h) {
      setFeedback({ type: 'error', msg: '무게와 박스 사이즈를 모두 입력해주세요.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/warehouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualWeightKg: weight,
          dimensions: { l, w, h },
          warehouseNotes: form.warehouseNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? '입고 처리에 실패했습니다.');
      }
      setDiscrepancy(data.discrepancy ?? null);
      setFeedback({ type: 'success', msg: '입고 처리가 완료되었습니다. 주문 상태가 WAREHOUSE_RECEIVED로 변경되었습니다.' });
      onSuccess();
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : '입고 처리 실패' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">실제 무게 (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.actualWeightKg}
            onChange={(e) => setForm((p) => ({ ...p, actualWeightKg: e.target.value }))}
            placeholder="예: 1.23"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">박스 사이즈 L×W×H (cm)</label>
          <div className="flex gap-1">
            {(['l', 'w', 'h'] as const).map((dim) => (
              <input
                key={dim}
                type="number"
                step="0.1"
                min="0.1"
                value={form[dim]}
                onChange={(e) => setForm((p) => ({ ...p, [dim]: e.target.value }))}
                placeholder={dim.toUpperCase()}
                className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">창고 메모 (선택)</label>
        <textarea
          rows={2}
          value={form.warehouseNotes}
          onChange={(e) => setForm((p) => ({ ...p, warehouseNotes: e.target.value }))}
          placeholder="특이사항, 포장 상태 등"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>처리 중...</> : '입고 처리'}
      </button>
      {feedback && <Toast message={feedback.msg} type={feedback.type} />}
      {discrepancy?.flagged && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          배송비 차이 경고: 예상 ${discrepancy.estimatedShippingUsd?.toFixed(2)} → 실제 ${discrepancy.actualShippingUsd.toFixed(2)}
          {discrepancy.diffPercent !== null && ` (${discrepancy.diffPercent}% 차이)`}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Phase 2 Payment Section
// ============================================================================
function Phase2Section({
  orderId,
  orderStatus,
  onSuccess,
}: {
  orderId: string;
  orderStatus: string;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [result, setResult] = useState<{
    phase2TotalUsd: number;
    dueAt: string;
    invoiceUrl?: string;
  } | null>(null);

  const handleRequest = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/request-phase2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Phase 2 결제 요청 실패');
      }
      setResult({
        phase2TotalUsd: data.phase2TotalUsd,
        dueAt: data.dueAt,
        invoiceUrl: data.invoiceUrl,
      });
      setFeedback({ type: 'success', msg: 'Phase 2 결제 요청이 고객에게 전송되었습니다.' });
      onSuccess();
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Phase 2 결제 요청 실패' });
    } finally {
      setLoading(false);
    }
  };

  const isPendingShipping = orderStatus === 'PENDING_SHIPPING_PAYMENT';

  return (
    <div className="space-y-4">
      {isPendingShipping ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <i className="fas fa-clock mr-2"></i>
          고객이 Phase 2 배송비 결제를 기다리고 있습니다.
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          창고 입고 후 실제 무게/사이즈 기반으로 계산된 배송비를 고객에게 청구합니다.
        </p>
      )}
      {!isPendingShipping && (
        <button
          onClick={handleRequest}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>처리 중...</> : 'Phase 2 결제 요청 전송'}
        </button>
      )}
      {feedback && <Toast message={feedback.msg} type={feedback.type} />}
      {result && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Phase 2 금액</span>
            <span className="font-semibold">${result.phase2TotalUsd.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">결제 기한</span>
            <span>{new Date(result.dueAt).toLocaleString('ko-KR')}</span>
          </div>
          {result.invoiceUrl && (
            <a
              href={result.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-purple-600 hover:underline"
            >
              <i className="fas fa-external-link-alt text-xs"></i>
              Shopify 인보이스 열기
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Shipping Section
// ============================================================================
function ShippingSection({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({
    carrier: 'ems' as 'ems' | 'dhl' | 'fedex' | 'other',
    trackingNumber: '',
    notifyCustomer: true,
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [fetchingShipment, setFetchingShipment] = useState(true);

  const [statusUpdate, setStatusUpdate] = useState({
    status: 'in_transit' as 'label_created' | 'picked_up' | 'in_transit' | 'customs_clearance' | 'delivered',
    description: '',
    location: '',
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/orders/${orderId}/shipping`)
      .then((r) => r.json())
      .then((d) => {
        if (d.shipment) setShipment(d.shipment);
      })
      .catch(() => {})
      .finally(() => setFetchingShipment(false));
  }, [orderId]);

  const handleCreate = async () => {
    if (!form.trackingNumber.trim()) {
      setFeedback({ type: 'error', msg: '운송장 번호를 입력해주세요.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/shipping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: form.carrier,
          trackingNumber: form.trackingNumber.trim(),
          notifyCustomer: form.notifyCustomer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '배송 정보 등록 실패');
      setShipment(data.shipment);
      setFeedback({ type: 'success', msg: `배송 정보가 등록되었습니다. Shopify 동기화: ${data.fulfillmentSync?.status ?? 'N/A'}` });
      onSuccess();
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : '배송 정보 등록 실패' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!statusUpdate.description.trim()) {
      setFeedback({ type: 'error', msg: '상태 설명을 입력해주세요.' });
      return;
    }
    setUpdatingStatus(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/shipping`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusUpdate.status,
          description: statusUpdate.description.trim(),
          location: statusUpdate.location.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '배송 상태 업데이트 실패');
      setShipment(data.shipment);
      setFeedback({ type: 'success', msg: '배송 상태가 업데이트되었습니다.' });
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : '배송 상태 업데이트 실패' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (fetchingShipment) {
    return <p className="text-sm text-gray-500">배송 정보 로딩 중...</p>;
  }

  return (
    <div className="space-y-4">
      {shipment ? (
        <>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">택배사</span>
              <span className="font-mono uppercase">{shipment.carrier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">운송장</span>
              <span className="font-mono">{shipment.trackingNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">상태</span>
              <span>{shipment.status}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">배송 상태 업데이트</p>
            <div className="space-y-2">
              <select
                value={statusUpdate.status}
                onChange={(e) =>
                  setStatusUpdate((p) => ({ ...p, status: e.target.value as typeof statusUpdate.status }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="label_created">라벨 발행</option>
                <option value="picked_up">픽업 완료</option>
                <option value="in_transit">이동 중</option>
                <option value="customs_clearance">통관 중</option>
                <option value="delivered">배송 완료</option>
              </select>
              <input
                type="text"
                value={statusUpdate.location}
                onChange={(e) => setStatusUpdate((p) => ({ ...p, location: e.target.value }))}
                placeholder="위치 (선택, 예: Incheon)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="text"
                value={statusUpdate.description}
                onChange={(e) => setStatusUpdate((p) => ({ ...p, description: e.target.value }))}
                placeholder="상태 설명 (필수)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleStatusUpdate}
                disabled={updatingStatus}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {updatingStatus ? <><i className="fas fa-spinner fa-spin mr-2"></i>업데이트 중...</> : '상태 업데이트'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">배송 정보를 등록합니다.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">택배사</label>
              <select
                value={form.carrier}
                onChange={(e) =>
                  setForm((p) => ({ ...p, carrier: e.target.value as typeof form.carrier }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ems">EMS (Korea Post)</option>
                <option value="dhl">DHL</option>
                <option value="fedex">FedEx</option>
                <option value="other">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">운송장 번호</label>
              <input
                type="text"
                value={form.trackingNumber}
                onChange={(e) => setForm((p) => ({ ...p, trackingNumber: e.target.value }))}
                placeholder="운송장 번호 입력"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.notifyCustomer}
                onChange={(e) => setForm((p) => ({ ...p, notifyCustomer: e.target.checked }))}
              />
              고객에게 배송 알림 발송
            </label>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>등록 중...</> : '배송 정보 등록'}
            </button>
          </div>
        </>
      )}
      {feedback && <Toast message={feedback.msg} type={feedback.type} />}
    </div>
  );
}

// ============================================================================
// Refund Section
// ============================================================================
function RefundSection({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const [form, setForm] = useState({
    reason: 'customer_request' as 'customer_request' | 'item_not_available' | 'item_damaged' | 'shipping_issue' | 'other',
    amount: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [refund, setRefund] = useState<RefundData | null>(null);
  const [fetchingRefund, setFetchingRefund] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/orders/${orderId}/refund`)
      .then((r) => r.json())
      .then((d) => {
        if (d.refund) setRefund(d.refund);
      })
      .catch(() => {})
      .finally(() => setFetchingRefund(false));
  }, [orderId]);

  const handleRefund = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = { reason: form.reason };
      if (form.notes.trim()) body.notes = form.notes.trim();
      const parsed = parseFloat(form.amount);
      if (!isNaN(parsed) && parsed > 0) body.amount = parsed;

      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '환불 처리 실패');
      setRefund(data.refund);
      setFeedback({ type: 'success', msg: '환불이 시작되었습니다.' });
      onSuccess();
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : '환불 처리 실패' });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingRefund) {
    return <p className="text-sm text-gray-500">환불 정보 로딩 중...</p>;
  }

  return (
    <div className="space-y-4">
      {refund ? (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">환불 사유</span>
            <span>{refund.reason}</span>
          </div>
          {refund.amount !== null && (
            <div className="flex justify-between">
              <span className="text-gray-500">환불 금액</span>
              <span>${refund.amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">상태</span>
            <span className="font-semibold">{refund.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">처리일</span>
            <span>{new Date(refund.createdAt).toLocaleString('ko-KR')}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">환불 사유</label>
            <select
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value as typeof form.reason }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="customer_request">고객 요청</option>
              <option value="item_not_available">상품 품절/구매 불가</option>
              <option value="item_damaged">상품 파손</option>
              <option value="shipping_issue">배송 문제</option>
              <option value="other">기타</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">환불 금액 ($, 선택 — 비워두면 전액)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="예: 29.99"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">메모 (선택)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="환불 관련 내부 메모"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <button
            onClick={handleRefund}
            disabled={loading}
            className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>처리 중...</> : '환불 시작'}
          </button>
        </div>
      )}
      {feedback && <Toast message={feedback.msg} type={feedback.type} />}
    </div>
  );
}

// ============================================================================
// Product Override Section
// Resolves the actual Product DB id by searching via sourceUrl, then patches.
// ============================================================================
function ProductOverrideSection({ sourceUrl }: { sourceUrl: string | null }) {
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [form, setForm] = useState({ weightKg: '', hsCode: '', origin: '' });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Resolve product ID from sourceUrl on mount
  useEffect(() => {
    if (!sourceUrl) return;
    setResolving(true);
    const domain = (() => {
      try { return new URL(sourceUrl).hostname; } catch { return ''; }
    })();
    fetch(`/api/admin/products?domain=${encodeURIComponent(domain)}&pageSize=5`)
      .then((r) => r.json())
      .then((d) => {
        const match = (d.products as Array<{ id: string; sourceUrl?: string }> | undefined)
          ?.find((p) => p.sourceUrl === sourceUrl || p.sourceUrl?.startsWith(sourceUrl.split('?')[0]));
        if (match) setResolvedId(match.id);
      })
      .catch(() => {})
      .finally(() => setResolving(false));
  }, [sourceUrl]);

  const handleSave = async () => {
    if (!resolvedId) {
      setFeedback({ type: 'error', msg: 'DB에서 상품을 찾을 수 없습니다. 상품 목록에서 직접 수정해주세요.' });
      return;
    }
    const payload: Record<string, unknown> = {};
    if (form.weightKg) payload.weightKg = parseFloat(form.weightKg);
    if (form.hsCode) payload.hsCode = form.hsCode.trim();
    if (form.origin) payload.origin = form.origin.trim();
    if (Object.keys(payload).length === 0) {
      setFeedback({ type: 'error', msg: '변경할 값을 입력해주세요.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/products/${resolvedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '상품 정보 수정 실패');
      setFeedback({ type: 'success', msg: `상품 정보가 업데이트되었습니다. (수정 필드: ${(data.editedFields as string[] | undefined)?.join(', ')})` });
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : '상품 정보 수정 실패' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:underline"
        >
          <i className="fas fa-external-link-alt"></i>
          원본 상품 페이지
        </a>
      )}
      {resolving && (
        <p className="text-xs text-gray-500">
          <i className="fas fa-spinner fa-spin mr-1"></i>상품 정보 조회 중...
        </p>
      )}
      {!resolving && !resolvedId && sourceUrl && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
          DB에서 상품을 찾을 수 없습니다. 상품 목록에서 직접 수정하거나 스크래핑 후 재시도하세요.
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">무게 (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.weightKg}
            onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
            placeholder="예: 0.5"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">HS 코드</label>
          <input
            type="text"
            value={form.hsCode}
            onChange={(e) => setForm((p) => ({ ...p, hsCode: e.target.value }))}
            placeholder="예: 6109.10"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">원산지</label>
          <input
            type="text"
            value={form.origin}
            onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))}
            placeholder="예: KR"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={loading || resolving}
        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <><i className="fas fa-spinner fa-spin mr-2"></i>저장 중...</> : '상품 정보 저장'}
      </button>
      {feedback && <Toast message={feedback.msg} type={feedback.type} />}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================
export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role, canOperate, isLoading: roleLoading } = useAdminRole();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    trackingNumber: '',
    forceLocalOnly: false,
    notifyCustomer: true,
  });
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchOrder(params.id as string);
    }
  }, [params.id]);

  const fetchOrder = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/orders/${id}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setOrder(data.order);
      setEditData({
        status: data.order.status,
        trackingNumber: data.order.trackingNumber || '',
        forceLocalOnly: false,
        notifyCustomer: true,
      });
      setSaveFeedback(null);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!order) return;
    if (!canOperate) {
      alert('주문 수정은 operator 이상 권한이 필요합니다.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editData.status,
          trackingNumber: editData.trackingNumber,
          forceLocalOnly: editData.forceLocalOnly,
          notifyCustomer: editData.notifyCustomer,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detailMessage = typeof payload?.detail === 'string'
          ? payload.detail
          : null;
        const errorMessage = typeof payload?.error === 'string'
          ? payload.error
          : null;
        throw new Error(detailMessage || errorMessage || 'Failed to update');
      }

      await fetchOrder(order.id);
      setEditMode(false);
      setSaveFeedback(buildSaveFeedback(payload?.shopifySync));
    } catch (error) {
      console.error('Failed to update order:', error);
      alert(error instanceof Error ? error.message : '주문 업데이트에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-500">
          <i className="fas fa-spinner fa-spin"></i>
          <span>로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">주문을 찾을 수 없습니다</p>
        <Link href="/admin/orders" className="text-purple-600 hover:underline mt-2 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // Determine which ops sections to show based on status
  const showWarehouse = ['PURCHASED', 'PAID', 'PROCESSING'].includes(order.status);
  const showPhase2 = ['WAREHOUSE_RECEIVED', 'PENDING_SHIPPING_PAYMENT'].includes(order.status);
  const showShipping = ['WAREHOUSE_RECEIVED', 'PENDING_SHIPPING_PAYMENT', 'SHIPPING_PAYMENT_OVERDUE', 'SHIPPING', 'CUSTOMS_CLEARANCE', 'DELIVERING'].includes(order.status);
  const showRefund = !TERMINAL_STATUSES.includes(order.status);
  const firstItemWithSourceUrl = order.items.find((i) => i.sourceUrl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              주문 #{order.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-gray-500">
              {order.userId || 'Guest'} •{' '}
              {new Date(order.createdAt).toLocaleString('ko-KR')}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={order.status} />
              {order.isDemo && (
                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  DEMO 주문
                </span>
              )}
            </div>
            {!roleLoading && (
              <p className="mt-1 text-xs text-gray-500">
                Role: {role ?? 'unknown'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Invoice quick-link */}
          <a
            href={`/api/admin/orders/${order.id}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
          >
            <i className="fas fa-file-invoice text-gray-400"></i>
            인보이스
          </a>
          {editMode ? (
            <>
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !canOperate}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (!canOperate) {
                  alert('주문 수정은 operator 이상 권한이 필요합니다.');
                  return;
                }
                setEditMode(true);
              }}
              disabled={!canOperate}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-edit mr-2"></i>
              수정
            </button>
          )}
        </div>
      </div>

      {!canOperate && !roleLoading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          현재 계정은 조회 전용입니다. 주문 상태/운송장 수정은 `operator` 이상 권한에서만 가능합니다.
        </div>
      )}

      {saveFeedback && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {saveFeedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 mb-1">주문 상태</p>
            {editMode ? (
              <select
                value={editData.status}
                onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-lg font-semibold text-gray-900">
                {STATUS_OPTIONS.find((o) => o.value === order.status)?.label || order.status}
              </p>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">주문 상품 ({order.items.length}개)</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <div key={item.id} className="p-4 flex gap-4">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-image text-gray-300"></i>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 line-clamp-2">
                      {item.name}
                    </h4>
                    {item.options && Object.keys(item.options).length > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {Object.entries(item.options)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-500">수량: {item.quantity}</span>
                      <span className="font-medium text-gray-900">
                        ₩{item.priceKrw.toLocaleString()}
                      </span>
                    </div>
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:underline mt-1 inline-block"
                      >
                        <i className="fas fa-external-link-alt mr-1"></i>
                        상품 링크
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Price Breakdown */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">상품 가격</span>
                <span>${order.priceBreakdown.productPriceUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">서비스 수수료</span>
                <span>${order.priceBreakdown.serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">국내 배송비</span>
                <span>${order.priceBreakdown.domesticShippingUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">국제 배송비</span>
                <span>${order.priceBreakdown.internationalShipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">관세</span>
                <span>${order.priceBreakdown.customsDuty.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">부가세</span>
                <span>${order.priceBreakdown.vat.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="font-medium text-gray-700">총 금액</span>
                <p className="text-xl font-bold text-gray-900">
                  ${order.totalUsd.toFixed(2)}
                </p>
              </div>
              <p className="text-xs text-gray-400 text-right">
                환율: 1 USD = ₩{order.priceBreakdown.exchangeRate.toLocaleString()}
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* OPS SECTIONS                                                  */}
          {/* ============================================================ */}
          {canOperate && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                운영 작업
              </h2>

              {showWarehouse && (
                <OpsSection title="창고 입고 처리" icon="fa-warehouse" defaultOpen>
                  <WarehouseSection
                    orderId={order.id}
                    onSuccess={() => fetchOrder(order.id)}
                  />
                </OpsSection>
              )}

              {showPhase2 && (
                <OpsSection title="Phase 2 배송비 청구" icon="fa-credit-card" defaultOpen={order.status === 'WAREHOUSE_RECEIVED'}>
                  <Phase2Section
                    orderId={order.id}
                    orderStatus={order.status}
                    onSuccess={() => fetchOrder(order.id)}
                  />
                </OpsSection>
              )}

              {showShipping && (
                <OpsSection title="배송 관리" icon="fa-shipping-fast">
                  <ShippingSection
                    orderId={order.id}
                    onSuccess={() => fetchOrder(order.id)}
                  />
                </OpsSection>
              )}

              {showRefund && (
                <OpsSection title="환불 처리" icon="fa-undo-alt">
                  <RefundSection
                    orderId={order.id}
                    onSuccess={() => fetchOrder(order.id)}
                  />
                </OpsSection>
              )}

              {firstItemWithSourceUrl && (
                <OpsSection title="상품 정보 수정" icon="fa-box">
                  <ProductOverrideSection
                    sourceUrl={firstItemWithSourceUrl.sourceUrl}
                  />
                </OpsSection>
              )}
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Shipping Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">배송 정보</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">배송 국가</p>
                <p className="text-gray-900">{order.shippingCountry || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">운송장 번호</p>
                {editMode ? (
                  <input
                    type="text"
                    value={editData.trackingNumber}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, trackingNumber: e.target.value }))
                    }
                    placeholder="운송장 번호 입력"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                ) : (
                  <p className="text-gray-900 font-mono">
                    {order.trackingNumber || '-'}
                  </p>
                )}
              </div>
              {editMode && (
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={editData.notifyCustomer}
                      onChange={(e) =>
                        setEditData((prev) => ({ ...prev, notifyCustomer: e.target.checked }))
                      }
                    />
                    Shopify 고객 알림 발송
                  </label>
                  <label className="flex items-center gap-2 text-sm text-amber-700">
                    <input
                      type="checkbox"
                      checked={editData.forceLocalOnly}
                      onChange={(e) =>
                        setEditData((prev) => ({ ...prev, forceLocalOnly: e.target.checked }))
                      }
                    />
                    Shopify 동기화 생략(로컬 상태만 저장)
                  </label>
                </div>
              )}
              {order.shippingAddress && (
                <div>
                  <p className="text-xs text-gray-500">배송지</p>
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-2 rounded mt-1">
                    {JSON.stringify(order.shippingAddress, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">빠른 작업</h3>
            <div className="space-y-2">
              <a
                href={`/api/admin/orders/${order.id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <i className="fas fa-file-invoice text-purple-500 w-4"></i>
                인보이스 생성
              </a>
            </div>
          </div>

          {/* Quote/Shopify Info */}
          {order.shopifyOrderId && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Shopify</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Order ID</p>
                  <p className="text-sm text-gray-600 font-mono">
                    {order.shopifyOrderId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fulfillment ID</p>
                  <p className="text-sm text-gray-600 font-mono">
                    {order.shopifyFulfillmentId || '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">시간 정보</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">생성일</span>
                <span className="text-gray-900">
                  {new Date(order.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">수정일</span>
                <span className="text-gray-900">
                  {new Date(order.updatedAt).toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildSaveFeedback(shopifySync: unknown): string {
  if (!shopifySync || typeof shopifySync !== 'object') {
    return '주문 업데이트가 완료되었습니다.';
  }

  const sync = shopifySync as {
    attempted?: boolean;
    synced?: boolean;
    skippedReason?: string;
    mode?: 'create_fulfillment' | 'update_tracking' | null;
  };

  if (sync.attempted && sync.synced) {
    if (sync.mode === 'create_fulfillment') {
      return '주문 업데이트가 완료되었습니다. Shopify 배송 생성도 반영되었습니다.';
    }
    if (sync.mode === 'update_tracking') {
      return '주문 업데이트가 완료되었습니다. Shopify 운송장도 동기화되었습니다.';
    }
    return '주문 업데이트가 완료되었습니다. Shopify 동기화가 반영되었습니다.';
  }

  if (sync.skippedReason === 'tracking_required') {
    return '주문 업데이트가 완료되었습니다. Shopify 동기화는 운송장 번호가 없어 생략되었습니다.';
  }
  if (sync.skippedReason === 'shopify_disabled') {
    return '주문 업데이트가 완료되었습니다. Shopify 연동이 비활성화되어 내부 상태만 저장되었습니다.';
  }
  if (sync.skippedReason === 'force_local_only') {
    return '주문 업데이트가 완료되었습니다. Shopify 동기화는 로컬 저장 모드로 생략되었습니다.';
  }
  if (sync.skippedReason === 'non_shopify_order') {
    return '주문 업데이트가 완료되었습니다. Shopify 주문이 아니라 내부 상태만 저장되었습니다.';
  }

  return '주문 업데이트가 완료되었습니다.';
}
