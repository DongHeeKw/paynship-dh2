import type { OrderStatus } from '@prisma/client';

export type OrderTransitionErrorCode =
  | 'ORDER_TRANSITION_INVALID'
  | 'ORDER_TERMINAL_STATE'
  | 'ORDER_TRACKING_REQUIRED';

interface TransitionValidationInput {
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  trackingNumber: string | null;
  trackingNumberIntl?: string | null;
}

interface TransitionValidationResult {
  ok: boolean;
  code?: OrderTransitionErrorCode;
  message?: string;
  allowedNextStatuses?: OrderStatus[];
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  // Phase 1: Product purchase
  PENDING_PAYMENT:          ['PURCHASED', 'CANCELLED'],
  PURCHASED:                ['WAREHOUSE_RECEIVED', 'PURCHASE_FAILED', 'CANCELLED'],
  PURCHASE_FAILED:          ['PURCHASED', 'CANCELLED', 'REFUND_PENDING'],

  // Warehouse
  WAREHOUSE_RECEIVED:       ['PENDING_SHIPPING_PAYMENT'],

  // Phase 2: Shipping payment
  PENDING_SHIPPING_PAYMENT: ['SHIPPING', 'SHIPPING_PAYMENT_OVERDUE', 'CANCELLED'],
  SHIPPING_PAYMENT_OVERDUE: ['SHIPPING', 'CANCELLED'],

  // Shipping
  SHIPPING:                 ['CUSTOMS_CLEARANCE', 'DELIVERING', 'DELIVERED', 'REFUND_PENDING'],
  CUSTOMS_CLEARANCE:        ['DELIVERING', 'DELIVERED', 'REFUND_PENDING'],
  DELIVERING:               ['DELIVERED', 'REFUND_PENDING'],
  DELIVERED:                ['COMPLETED', 'REFUND_PENDING'],

  // Terminal
  COMPLETED:                ['REFUND_PENDING'],
  CANCELLED:                ['REFUND_PENDING'],
  REFUND_PENDING:           ['CANCELLED', 'COMPLETED'],

  // Legacy compat
  PENDING:                  ['PAID', 'CANCELLED'],
  PAID:                     ['PROCESSING', 'CANCELLED'],
  PROCESSING:               ['SHIPPED', 'CANCELLED'],
  SHIPPED:                  ['DELIVERED'],
};

export function validateOrderTransition({
  currentStatus,
  nextStatus,
  trackingNumber,
  trackingNumberIntl,
}: TransitionValidationInput): TransitionValidationResult {
  if (currentStatus === nextStatus) {
    if (nextStatus === 'SHIPPED' && !trackingNumber) {
      return {
        ok: false,
        code: 'ORDER_TRACKING_REQUIRED',
        message: 'SHIPPED 상태에서는 운송장 번호가 필요합니다.',
      };
    }

    if (nextStatus === 'SHIPPING' && !trackingNumberIntl && !trackingNumber) {
      return {
        ok: false,
        code: 'ORDER_TRACKING_REQUIRED',
        message: 'SHIPPING 상태에서는 국제 운송장 번호가 필요합니다.',
      };
    }

    return { ok: true };
  }

  const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] ?? [];
  if (allowedNextStatuses.length === 0) {
    return {
      ok: false,
      code: 'ORDER_TERMINAL_STATE',
      message: `${currentStatus} 상태에서는 더 이상 변경할 수 없습니다.`,
      allowedNextStatuses,
    };
  }

  if (!allowedNextStatuses.includes(nextStatus)) {
    return {
      ok: false,
      code: 'ORDER_TRANSITION_INVALID',
      message: `${currentStatus} -> ${nextStatus} 전이는 허용되지 않습니다.`,
      allowedNextStatuses,
    };
  }

  if (nextStatus === 'SHIPPED' && !trackingNumber) {
    return {
      ok: false,
      code: 'ORDER_TRACKING_REQUIRED',
      message: 'SHIPPED 상태로 변경하려면 운송장 번호가 필요합니다.',
      allowedNextStatuses,
    };
  }

  if (nextStatus === 'SHIPPING' && !trackingNumberIntl && !trackingNumber) {
    return {
      ok: false,
      code: 'ORDER_TRACKING_REQUIRED',
      message: 'SHIPPING 상태로 변경하려면 국제 운송장 번호가 필요합니다.',
      allowedNextStatuses,
    };
  }

  return { ok: true };
}

export function getAllowedNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
  return [...(VALID_TRANSITIONS[currentStatus] ?? [])];
}
