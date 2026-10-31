export const CUSTOMS_ID_TYPES = ['NONE', 'NIK', 'NPWP', 'PASSPORT'] as const;
export type CustomsIdType = typeof CUSTOMS_ID_TYPES[number];
export const CUSTOMS_AUTHORIZATIONS = ['NONE', 'EZWAY', 'BROKER', 'DEFERRED'] as const;
export type CustomsAuthorization = typeof CUSTOMS_AUTHORIZATIONS[number];
export type CustomsVerificationState = 'NOT_REQUIRED' | 'FORMAT_ONLY' | 'REVIEW_REQUIRED' | 'PROVIDER_VERIFIED';
export type RecipientRequirement = 'NONE_BY_DEFAULT' | 'EXTERNAL_AUTHORIZATION' | 'RECIPIENT_IDENTIFIER' | 'ENTRY_SPECIFIC' | 'MANUAL_REVIEW';

export interface CustomsSource {
  title: string;
  url: string;
  checkedAt: string;
}

export interface CountryCustomsPolicy {
  id: string;
  country: string;
  revision: string;
  reviewDueAt: string | null;
  requirement: RecipientRequirement;
  customerHint: string;
  sources: readonly CustomsSource[];
}

export interface CustomsVerificationSnapshot {
  country: string;
  policyId: string;
  policyRevision: string;
  requirement: RecipientRequirement;
  state: CustomsVerificationState;
  identityVerified: false;
  assessedAt: string;
}
