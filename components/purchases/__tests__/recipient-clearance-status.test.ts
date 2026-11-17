// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { DeliveryProfile } from '@/lib/purchases/schemas';
import type { RecipientEvidence } from '@/lib/customs/recipient-evidence';
import RecipientClearanceStatus from '../RecipientClearanceStatus';

const now = Date.parse('2026-10-18T12:00:00.000Z');
const delivery: DeliveryProfile = { fullName: 'SAMPLE Recipient', phone: '+12025550101', country: 'CN', address1: 'SAMPLE ONLY', address2: '', city: 'Sample City', region: '', postalCode: '000000', customsId: 'PRIVATE-IDENTIFIER-MUST-NOT-RENDER', customsIdType: 'NONE', customsAuthorization: 'NONE' };
const evidence: RecipientEvidence = { method: 'BROKER_REVIEW', reference: 'https://broker.example/secure/sample-record', verifiedAt: '2026-10-18T00:00:00.000Z', validUntil: '2026-10-25T00:00:00.000Z', notes: 'Fictional external evidence record.', shipmentReference: 'SAMPLE-AWB-123' };
const review = { destination: 'CN', recipientEvidence: evidence, rulesVerifiedAt: '2026-10-18T00:00:00.000Z', rulesValidUntil: '2026-10-25T00:00:00.000Z', rulesReference: 'https://customs.example/sample-rules' };
const props = { country: 'CN', delivery, review, carrier: 'Sample carrier', trackingNumber: 'SAMPLE-AWB-123', now };
afterEach(cleanup);

describe('operator recipient clearance visibility', () => {
  it('shows missing evidence and absent provider verification without exposing an identifier', () => {
    const { container } = render(createElement(RecipientClearanceStatus, { ...props, review: null }));
    expect(screen.getAllByText('Missing — review required')).toHaveLength(2);
    expect(screen.getByText('Not performed by this service')).toBeTruthy();
    expect(container.textContent).not.toContain(delivery.customsId);
    expect(screen.getByText(/None recorded. Obtain route-specific evidence/)).toBeTruthy();
  });

  it('distinguishes current operator evidence and a shipment reference match from actual clearance', () => {
    render(createElement(RecipientClearanceStatus, props));
    expect(screen.getByText('Operator review recorded')).toBeTruthy();
    expect(screen.getByText('Reference matches this shipment')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('not a government or carrier clearance result');
    expect(screen.getByText('Not performed by this service')).toBeTruthy();
  });

  it('marks expired recipient and product/customs evidence as requiring review', () => {
    const expired = { ...review, rulesValidUntil: '2026-10-17T00:00:00.000Z', recipientEvidence: { ...evidence, validUntil: '2026-10-17T00:00:00.000Z' } };
    render(createElement(RecipientClearanceStatus, { ...props, review: expired }));
    expect(screen.getAllByText('Expired or invalid — review required')).toHaveLength(2);
    expect(screen.queryByText('Operator review recorded')).toBeNull();
  });

  it.each([['missing', undefined, 'Missing shipment evidence reference'], ['mismatched', 'OTHER-SAMPLE-AWB', 'Mismatch — shipment review required']])('surfaces %s China shipment binding', (_label, shipmentReference, expected) => {
    render(createElement(RecipientClearanceStatus, { ...props, review: { ...review, recipientEvidence: { ...evidence, shipmentReference } } }));
    expect(screen.getByText(expected)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('still needed');
  });

  it('rejects an otherwise fresh review for a different destination', () => {
    render(createElement(RecipientClearanceStatus, { ...props, review: { ...review, destination: 'JP' } }));
    expect(screen.getByText('Destination mismatch — review required')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('still needed');
  });

  it('surfaces an overdue built-in policy even if operator evidence dates remain current', () => {
    const later = Date.parse('2026-11-12T12:00:00.000Z');
    const recent = { ...review, rulesVerifiedAt: '2026-11-12T00:00:00.000Z', rulesValidUntil: '2026-11-20T00:00:00.000Z', recipientEvidence: { ...evidence, verifiedAt: '2026-11-12T00:00:00.000Z', validUntil: '2026-11-20T00:00:00.000Z' } };
    render(createElement(RecipientClearanceStatus, { ...props, now: later, review: recent }));
    expect(screen.getByText(/Overdue — refresh required/)).toBeTruthy();
    expect(screen.queryByText('Operator review recorded')).toBeNull();
  });
});
