import type { DataSourceType } from '@/types';

/** Historical quote evidence retained for the static calculator. */
export type QuoteGateStatus = 'green' | 'amber' | 'red';
export type CriticalQuoteField = 'weightKg' | 'dimensions' | 'hsCode' | 'origin' | 'domesticShipping';

export interface QuoteFieldEvidence {
  field: CriticalQuoteField;
  status: 'verified' | 'inferred' | 'missing';
  confidence: number;
  value?: unknown;
  sourceType?: DataSourceType;
  provenance: string[];
}

export interface QuoteQualityGate {
  status: QuoteGateStatus;
  score: number;
  reasons: string[];
  requiredActions: string[];
  fields: Record<CriticalQuoteField, QuoteFieldEvidence>;
}
