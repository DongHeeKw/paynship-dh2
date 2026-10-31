import { z } from 'zod';
import { deliveryProfileSchema, type DeliveryProfile } from './delivery-schema';
import { countryPolicyNeedsRefresh, getCountryCustomsPolicy } from './country-policy';
import type { CustomsVerificationSnapshot, CustomsVerificationState } from './types';

export type StoredDeliveryProfile = DeliveryProfile & { customsVerification: CustomsVerificationSnapshot };

export function buildStoredDeliveryProfile(input: unknown, now = Date.now()): StoredDeliveryProfile {
  const profile = deliveryProfileSchema.parse(input);
  const policy = getCountryCustomsPolicy(profile.country);
  let state: CustomsVerificationState = 'REVIEW_REQUIRED';
  if (!countryPolicyNeedsRefresh(profile.country, now)) {
    if (policy.requirement === 'NONE_BY_DEFAULT') state = 'NOT_REQUIRED';
    if (profile.country === 'ID' && ['NIK', 'NPWP'].includes(profile.customsIdType)) state = 'FORMAT_ONLY';
  }
  return {
    ...profile,
    customsVerification: {
      country: profile.country, policyId: policy.id, policyRevision: policy.revision,
      requirement: policy.requirement, state, identityVerified: false, assessedAt: new Date(now).toISOString(),
    },
  };
}

export function deliveryProfileInput(profile: StoredDeliveryProfile): DeliveryProfile {
  const { customsVerification: _serverState, ...input } = profile;
  return deliveryProfileSchema.parse(input);
}

// Saved profiles from the previous generic-ID form are read conservatively.
// Do not guess an identifier type or inherit an old verification claim. This
// does not delete historical ciphertext; subsequent saves replace the profile.
export function readStoredDeliveryProfile(raw: unknown, now = Date.now()): StoredDeliveryProfile {
  const stored = z.record(z.unknown()).parse(raw);
  const { customsVerification: _oldState, ...input } = stored;
  if (input.country !== 'ID' || !input.customsIdType || input.customsIdType === 'NONE') {
    input.customsId = '';
    input.customsIdType = 'NONE';
  }
  if (input.country === 'TW' && (!input.customsAuthorization || input.customsAuthorization === 'NONE')) input.customsAuthorization = 'DEFERRED';
  if (input.country === 'ID' && input.customsIdType === 'NONE') input.customsAuthorization = 'DEFERRED';
  return buildStoredDeliveryProfile(input, now);
}
