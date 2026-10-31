import { describe, expect, it } from 'vitest';
import { deliveryProfileSchema } from '../delivery-schema';
import { buildStoredDeliveryProfile, readStoredDeliveryProfile, deliveryProfileInput } from '../delivery';
import { getCountryCustomsPolicy } from '../country-policy';
import { changeDeliveryCountry } from '@/components/purchases/delivery-form-data';

const now = Date.parse('2026-10-12T03:00:00Z');
const recipient = {
  fullName: '山田 太郎', phone: '+819012345678', country: 'JP', address1: '千代田1-1',
  address2: '', city: '千代田区', region: '東京都', postalCode: '1000001',
  customsId: '', customsIdType: 'NONE', customsAuthorization: 'NONE',
};

describe('country-specific delivery input', () => {
  it('preserves Unicode names and addresses while normalizing a Japanese postcode', () => {
    expect(deliveryProfileSchema.parse({ ...recipient, fullName: '  山田 太郎  ' })).toMatchObject({ fullName: '山田 太郎', address1: '千代田1-1', postalCode: '100-0001' });
  });
  it.each([
    ['JP', '100-0001'], ['SG', '048581'], ['US', '10001'], ['US', '10001-1234'], ['HK', ''],
    ['TW', '100'], ['TW', '10001'], ['TW', '100001'], ['TW', '100-001'], ['AE', ''], ['GB', 'SW1A 1AA'],
  ])('accepts the configured %s postcode shape %s without claiming deliverability', (country, postalCode) => {
    expect(deliveryProfileSchema.safeParse({ ...recipient, country, postalCode, customsAuthorization: country === 'TW' ? 'DEFERRED' : 'NONE' }).success).toBe(true);
  });
  it.each([['US', '1234'], ['US', 'ABCDE'], ['US', '123456789'], ['SG', '12345'], ['JP', '12345'], ['TW', '1234']])('rejects invalid %s postcode shape %s', (country, postalCode) => {
    expect(deliveryProfileSchema.safeParse({ ...recipient, country, postalCode, customsAuthorization: country === 'TW' ? 'DEFERRED' : 'NONE' }).success).toBe(false);
  });
  it.each(['09012345678', '+81 9012345678', '+0123456789', '+123456', '+1234567890123456'])('rejects a phone without the bounded international shape: %s', phone => {
    expect(deliveryProfileSchema.safeParse({ ...recipient, phone }).success).toBe(false);
  });
  it('accepts international phone shape without marking the recipient or number verified', () => {
    const stored = buildStoredDeliveryProfile({ ...recipient, phone: '+6591234567', country: 'SG', postalCode: '048581' }, now);
    expect(stored.customsVerification).toMatchObject({ state: 'NOT_REQUIRED', identityVerified: false });
    expect(stored).not.toHaveProperty('phoneVerified');
  });
  it.each(['fullName', 'address1', 'city', 'region'])('rejects embedded control characters in %s', field => {
    expect(deliveryProfileSchema.safeParse({ ...recipient, [field]: 'Valid\u0000Invalid' }).success).toBe(false);
  });
  it.each(['JP', 'SG', 'HK', 'US', 'TW', 'CN'])('rejects unnecessary national or Korean customs identifiers for %s', country => {
    expect(deliveryProfileSchema.safeParse({ ...recipient, country, customsId: 'P123456789012', customsAuthorization: country === 'TW' ? 'EZWAY' : 'NONE' }).success).toBe(false);
  });
});

describe('recipient identity claims stay server-controlled', () => {
  const indonesia = { ...recipient, country: 'ID', postalCode: '10110', customsIdType: 'NIK', customsId: '0000000000000000' };
  it('checks a 16-digit NIK shape even when it is not a real identity', () => {
    const stored = buildStoredDeliveryProfile(indonesia, now);
    expect(stored.customsVerification).toMatchObject({ country: 'ID', state: 'FORMAT_ONLY', identityVerified: false });
  });
  it.each(['123', '123456789012345A', 'P123456789012'])('rejects an unsupported NIK shape %s', customsId => {
    expect(deliveryProfileSchema.safeParse({ ...indonesia, customsId }).success).toBe(false);
  });
  it.each(['000000000000000', '0000000000000000'])('accepts the documented NPWP length %s only as FORMAT_ONLY', customsId => {
    expect(buildStoredDeliveryProfile({ ...indonesia, customsIdType: 'NPWP', customsId }, now).customsVerification.state).toBe('FORMAT_ONLY');
  });
  it('does not invent a universal passport-format verification', () => {
    expect(buildStoredDeliveryProfile({ ...indonesia, customsIdType: 'PASSPORT', customsId: 'TEST PASSPORT' }, now).customsVerification.state).toBe('REVIEW_REQUIRED');
  });
  it('allows direct carrier/broker collection without storing an identifier in the profile', () => {
    const stored = buildStoredDeliveryProfile({ ...indonesia, customsIdType: 'NONE', customsId: '', customsAuthorization: 'DEFERRED' }, now);
    expect(stored.customsId).toBe(''); expect(stored.customsVerification.state).toBe('REVIEW_REQUIRED');
  });
  it('rejects customer-supplied verification fields and reserved provider state', () => {
    expect(() => buildStoredDeliveryProfile({ ...indonesia, customsVerification: { state: 'PROVIDER_VERIFIED' } }, now)).toThrow();
    expect(() => buildStoredDeliveryProfile({ ...indonesia, identityVerified: true }, now)).toThrow();
  });
  it('removes old country identifiers and their verification state when changing destinations', () => {
    const input = deliveryProfileSchema.parse(indonesia);
    const changed = changeDeliveryCountry(input, 'TW');
    expect(changed).toMatchObject({ customsId: '', customsIdType: 'NONE', customsAuthorization: 'DEFERRED' });
    expect(buildStoredDeliveryProfile(changed, now).customsVerification).toMatchObject({ country: 'TW', state: 'REVIEW_REQUIRED', identityVerified: false });
  });
  it('never inherits a saved provider claim or guesses the type of a legacy generic identifier', () => {
    const legacy = readStoredDeliveryProfile({ ...recipient, country: 'TW', postalCode: '100', customsId: 'OLD-NATIONAL-ID', customsVerification: { state: 'PROVIDER_VERIFIED', country: 'JP' } }, now);
    expect(legacy.customsId).toBe(''); expect(legacy.customsAuthorization).toBe('DEFERRED');
    expect(legacy.customsVerification).toMatchObject({ country: 'TW', state: 'REVIEW_REQUIRED', identityVerified: false });
    expect(deliveryProfileInput(legacy)).not.toHaveProperty('customsVerification');
  });
  it('keeps every unaudited destination in manual review and never enables fulfilment just from a country selection', () => {
    const policy = getCountryCustomsPolicy('MY');
    expect(policy).toMatchObject({ requirement: 'MANUAL_REVIEW', sources: [] });
    expect(buildStoredDeliveryProfile({ ...recipient, country: 'MY', postalCode: '50000' }, now).customsVerification.state).toBe('REVIEW_REQUIRED');
  });
});
