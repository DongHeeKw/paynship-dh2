export const PURCHASE_STATUSES = ['REVIEW_REQUIRED', 'QUOTED', 'PAYMENT_PENDING', 'PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'ON_HOLD', 'REJECTED', 'CANCELLED'] as const;
export type PurchaseStatus = typeof PURCHASE_STATUSES[number];
export const STATUS_LABELS: Record<PurchaseStatus, string> = {
  REVIEW_REQUIRED: 'Under review', QUOTED: 'Quote ready', PAYMENT_PENDING: 'Awaiting payment', PAID: 'Payment confirmed',
  PURCHASING: 'Buying from seller', AT_WAREHOUSE: 'Received at warehouse', READY_TO_SHIP: 'Ready to ship',
  SHIPPED: 'In transit', DELIVERED: 'Delivered', ON_HOLD: 'Needs attention', REJECTED: 'Cannot fulfil', CANCELLED: 'Cancelled',
};
export const TRANSITIONS: Record<PurchaseStatus, readonly PurchaseStatus[]> = {
  REVIEW_REQUIRED: ['QUOTED', 'REJECTED', 'CANCELLED'], QUOTED: ['PAYMENT_PENDING', 'REVIEW_REQUIRED', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'ON_HOLD'], PAID: ['PURCHASING', 'ON_HOLD'], PURCHASING: ['AT_WAREHOUSE', 'ON_HOLD'],
  AT_WAREHOUSE: ['READY_TO_SHIP', 'ON_HOLD'], READY_TO_SHIP: ['SHIPPED', 'ON_HOLD'], SHIPPED: ['DELIVERED', 'ON_HOLD'],
  DELIVERED: [], ON_HOLD: [], REJECTED: [], CANCELLED: [],
};
