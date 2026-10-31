'use client';

import { OrderSummary } from '@/app/api/orders/route';
import { getOrderStatusTone } from '@/lib/ui/theme';

interface OrderListProps {
  orders: OrderSummary[];
  selectedOrderId?: string | null;
  onSelectOrder: (orderId: string) => void;
  isLoading?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  // New 2-phase statuses
  PENDING_PAYMENT: 'Pending Payment',
  PURCHASED: 'Purchased',
  WAREHOUSE_RECEIVED: 'At Warehouse',
  PENDING_SHIPPING_PAYMENT: 'Shipping Payment',
  SHIPPING: 'Shipping',
  CUSTOMS_CLEARANCE: 'Customs',
  DELIVERING: 'Delivering',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  // Legacy status aliases
  PENDING: 'Pending Payment',
  PAID: 'Purchased',
  PROCESSING: 'Purchased',
  SHIPPED: 'Shipping',
};

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OrderList({
  orders,
  selectedOrderId,
  onSelectOrder,
  isLoading = false,
}: OrderListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="animate-pulse rounded-[22px] border border-[var(--pn-border)] bg-white/80 p-4 h-24 shadow-[0_16px_34px_rgba(18,24,32,0.05)]"
          />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="pn-card-soft text-center py-12 px-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--pn-brand-soft)] text-[var(--pn-brand)]">
          <i className="fas fa-box-open text-2xl"></i>
        </div>
        <p className="mb-2 text-[var(--pn-ink)] font-semibold">No orders yet</p>
        <p className="text-sm text-[var(--pn-ink-muted)]">
          Your orders will appear here after checkout
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(order => {
        const status = getOrderStatusTone(order.status);
        const isSelected = selectedOrderId === order.id;

        return (
          <button
            key={order.id}
            onClick={() => onSelectOrder(order.id)}
            className={`w-full text-left p-4 rounded-[24px] border transition-all ${
              isSelected
                ? 'border-[var(--pn-brand-soft)] bg-[rgba(232,238,245,0.72)] shadow-[0_18px_38px_rgba(0,55,100,0.08)]'
                : 'border-[var(--pn-border)] bg-white/90 hover:border-[var(--pn-border-strong)] hover:shadow-[0_16px_34px_rgba(18,24,32,0.06)]'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Product Image */}
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-[18px] border border-[var(--pn-border)] bg-[var(--pn-surface-soft)]">
                {order.productImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={order.productImage}
                    alt={order.productName || 'Product'}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <i className="fas fa-box text-[var(--pn-ink-muted)]"></i>
                  </div>
                )}
              </div>

              {/* Order Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="truncate font-medium text-[var(--pn-ink)]">
                    {order.productName || 'Order'}
                  </h3>
                  <div className="flex items-center gap-1">
                    {order.isDemo && (
                      <span className="rounded-full border border-[var(--pn-warning-soft)] bg-[var(--pn-warning-soft)] px-2 py-0.5 text-xs font-medium text-[var(--pn-warning)]">
                        Demo
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.badge}`}>
                      {STATUS_LABELS[order.status] || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--pn-ink-muted)]">{formatDate(order.createdAt)}</span>
                  <span className="font-semibold text-[var(--pn-ink)]">
                    ${order.totalUsd.toFixed(2)}
                  </span>
                </div>

                {order.trackingNumber && (
                  <div className="mt-1 text-xs text-[var(--pn-brand)]">
                    <i className="fas fa-truck mr-1"></i>
                    {order.trackingNumber}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
