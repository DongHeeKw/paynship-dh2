import { describe, expect, it } from 'vitest';
import { recipientEvidenceSchema, validateRecipientEvidence } from '../recipient-evidence';
import { deliveryProfileSchema } from '../delivery-schema';
import { CUSTOMS_SOURCES } from '../sources';

const now = Date.parse('2026-10-12T03:00:00Z');
const delivery = deliveryProfileSchema.parse({ fullName: 'Test Recipient', phone: '+6591234567', country: 'SG', address1: '1 Test Street', city: 'Singapore', postalCode: '048581' });
const evidence = { method: 'NOT_REQUIRED', reference: CUSTOMS_SOURCES.singaporeParcels.url,
  verifiedAt: '2026-10-12T00:00:00Z', validUntil: '2026-10-20T00:00:00Z', notes: 'Test operator reviewed route documents; this is not a provider identity response.' };

describe('recipient evidence approval boundary', () => {
  it('allows a current compatible operator review without promoting identity to provider verified', () => {
    const result = validateRecipientEvidence('SG', delivery, evidence, now);
    expect(result.method).toBe('NOT_REQUIRED'); expect(result).not.toHaveProperty('identityVerified');
  });
  it('rejects a recipient country mismatch', () => {
    expect(() => validateRecipientEvidence('JP', delivery, evidence, now)).toThrow('destination');
  });
  it.each([
    { verifiedAt: '2026-10-13T00:00:00Z' }, { verifiedAt: '2025-01-01T00:00:00Z' },
    { validUntil: '2026-10-11T00:00:00Z' }, { validUntil: '2026-12-12T00:00:00Z' },
  ])('rejects stale, future, expired or unbounded recipient evidence %j', patch => {
    expect(() => validateRecipientEvidence('SG', delivery, { ...evidence, ...patch }, now)).toThrow();
  });
  it('fails closed when the configured policy source review deadline passed', () => {
    const later = Date.parse('2026-11-12T00:00:00Z');
    expect(() => validateRecipientEvidence('SG', delivery, { ...evidence, verifiedAt: '2026-11-11T00:00:00Z', validUntil: '2026-11-20T00:00:00Z' }, later)).toThrow('source refresh');
  });
  it('requires a broker review for a destination whose requirements have not been configured', () => {
    const other = { ...delivery, country: 'MY' as const };
    expect(() => validateRecipientEvidence('MY', other, evidence, now)).toThrow('broker');
    expect(validateRecipientEvidence('MY', other, { ...evidence, method: 'BROKER_REVIEW' }, now).method).toBe('BROKER_REVIEW');
  });
  it('rejects credentials, HTTP and client claims of government/provider verification', () => {
    expect(recipientEvidenceSchema.safeParse({ ...evidence, reference: 'https://user:pass@example.com/record' }).success).toBe(false);
    expect(recipientEvidenceSchema.safeParse({ ...evidence, reference: 'http://example.com/record' }).success).toBe(false);
    expect(recipientEvidenceSchema.safeParse({ ...evidence, state: 'PROVIDER_VERIFIED' }).success).toBe(false);
  });
  it('allows a Taiwan broker authorization plan before purchase but requires exact shipment authorization before dispatch', () => {
    const taiwan = { ...delivery, country: 'TW' as const, customsAuthorization: 'EZWAY' as const };
    const plan = { ...evidence, method: 'BROKER_REVIEW', reference: CUSTOMS_SOURCES.taiwanAuthorization.url };
    expect(validateRecipientEvidence('TW', taiwan, plan, now, 'purchasing').method).toBe('BROKER_REVIEW');
    expect(() => validateRecipientEvidence('TW', taiwan, plan, now, 'shipping', 'TEST-AWB')).toThrow();
    const authorization = { ...plan, method: 'EZWAY_AUTHORIZATION', shipmentReference: 'TEST-AWB' };
    expect(validateRecipientEvidence('TW', taiwan, authorization, now, 'shipping', 'TEST-AWB').shipmentReference).toBe('TEST-AWB');
    expect(() => validateRecipientEvidence('TW', taiwan, authorization, now, 'shipping', 'OTHER-AWB')).toThrow('shipment');
  });
  it('supports a broker route for Taiwan recipients and rejects unresolved deferred routes at dispatch', () => {
    const taiwan = { ...delivery, country: 'TW' as const, customsAuthorization: 'BROKER' as const };
    const broker = { ...evidence, method: 'BROKER_REVIEW', shipmentReference: 'TEST-AWB', reference: CUSTOMS_SOURCES.taiwanAuthorization.url };
    expect(validateRecipientEvidence('TW', taiwan, broker, now, 'shipping', 'TEST-AWB').method).toBe('BROKER_REVIEW');
    expect(() => validateRecipientEvidence('TW', { ...taiwan, customsAuthorization: 'DEFERRED' }, broker, now, 'shipping', 'TEST-AWB')).toThrow('Resolve');
  });
});
