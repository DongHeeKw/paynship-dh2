export type ProcurementBatchStatus =
  | 'draft'
  | 'queued'
  | 'sourcing'
  | 'approved'
  | 'purchased'
  | 'partially_purchased'
  | 'cancelled';

export type ProcurementTaskStatus =
  | 'queued'
  | 'researching'
  | 'ready_to_buy'
  | 'purchased'
  | 'failed'
  | 'cancelled';

export interface ProcurementBatchRecord {
  id: string;
  status: ProcurementBatchStatus;
  sourceVendor: string | null;
  selectedSourceUrl: string | null;
  orderIntentIds: string[];
  operatorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementTaskRecord {
  id: string;
  batchId: string | null;
  orderIntentId: string | null;
  canonicalProductId: string | null;
  status: ProcurementTaskStatus;
  selectedSourceUrl: string | null;
  lowestPriceKrw: number | null;
  availabilityStatus: string | null;
  reviewSummary: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProcurementBatchInput {
  status?: ProcurementBatchStatus;
  sourceVendor?: string | null;
  selectedSourceUrl?: string | null;
  orderIntentIds?: string[];
  operatorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateProcurementBatchInput {
  status?: ProcurementBatchStatus;
  sourceVendor?: string | null;
  selectedSourceUrl?: string | null;
  orderIntentIds?: string[];
  operatorUserId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateProcurementTaskInput {
  batchId?: string | null;
  orderIntentId?: string | null;
  canonicalProductId?: string | null;
  status?: ProcurementTaskStatus;
  selectedSourceUrl?: string | null;
  lowestPriceKrw?: number | null;
  availabilityStatus?: string | null;
  reviewSummary?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateProcurementTaskInput {
  status?: ProcurementTaskStatus;
  selectedSourceUrl?: string | null;
  lowestPriceKrw?: number | null;
  availabilityStatus?: string | null;
  reviewSummary?: string | null;
  metadata?: Record<string, unknown> | null;
}
