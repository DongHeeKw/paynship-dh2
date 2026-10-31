export type OrderIntentStatus =
  | 'pending_review'
  | 'auto_accepted'
  | 'accepted'
  | 'requote_required'
  | 'rejected'
  | 'cancelled';

export type PaymentRequestStatus =
  | 'draft'
  | 'ready'
  | 'paid'
  | 'expired'
  | 'cancelled';

export type QuoteQualityStatus = 'green' | 'amber' | 'red' | 'unknown';

export interface OrderIntentRecord {
  id: string;
  quoteId: string | null;
  userId: string | null;
  sessionId: string | null;
  status: OrderIntentStatus;
  quoteQuality: QuoteQualityStatus;
  checkoutEligible: boolean;
  totalUsd: number;
  currency: string;
  destinationCountry: string | null;
  acceptanceReason: string | null;
  reviewSummary: string | null;
  paymentRequestId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequestRecord {
  id: string;
  orderIntentId: string;
  quoteId: string | null;
  userId: string | null;
  status: PaymentRequestStatus;
  amountUsd: number;
  currency: string;
  shopifyDraftId: string | null;
  invoiceUrl: string | null;
  expiresAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderIntentInput {
  quoteId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  status: OrderIntentStatus;
  quoteQuality: QuoteQualityStatus;
  checkoutEligible: boolean;
  totalUsd: number;
  currency?: string;
  destinationCountry?: string | null;
  acceptanceReason?: string | null;
  reviewSummary?: string | null;
  paymentRequestId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateOrderIntentInput {
  status?: OrderIntentStatus;
  acceptanceReason?: string | null;
  reviewSummary?: string | null;
  paymentRequestId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListOrderIntentsInput {
  status?: OrderIntentStatus;
  userId?: string | null;
  limit?: number;
}

export interface CreatePaymentRequestInput {
  orderIntentId: string;
  quoteId?: string | null;
  userId?: string | null;
  status?: PaymentRequestStatus;
  amountUsd: number;
  currency?: string;
  shopifyDraftId?: string | null;
  invoiceUrl?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ListPaymentRequestsInput {
  quoteId?: string | null;
  userId?: string | null;
  status?: PaymentRequestStatus;
  limit?: number;
}
