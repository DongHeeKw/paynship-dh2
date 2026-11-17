// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RecipientEvidence } from '@/lib/customs/recipient-evidence';
import RecipientEvidenceFields from '../RecipientEvidenceFields';
import { parseRecipientEvidenceForm } from '../recipient-form-data';

const evidence: RecipientEvidence = {
  method: 'BROKER_REVIEW', reference: 'https://broker.example/secure/sample-record',
  verifiedAt: '2026-10-18T00:00:00.000Z', validUntil: '2026-10-25T00:00:00.000Z',
  notes: 'Fictional broker evidence for a component test. No identity documents.',
};
afterEach(cleanup);

describe('recipient shipment evidence fields', () => {
  it.each(['CN', 'TW'])('lets the operator record the exact %s shipment without requesting a raw identity number', country => {
    render(createElement('form', { 'aria-label': 'Recipient evidence' }, createElement(RecipientEvidenceFields, { country, evidence })));
    const input = screen.getByLabelText(/^Reviewed shipment \/ airwaybill reference/);
    fireEvent.change(input, { target: { value: 'SAMPLE-AWB-123' } });
    const parsed = parseRecipientEvidenceForm(new FormData(screen.getByRole('form', { name: 'Recipient evidence' }) as HTMLFormElement));
    expect(parsed.shipmentReference).toBe('SAMPLE-AWB-123');
    expect(parsed.method).toBe('BROKER_REVIEW');
    expect(screen.queryByLabelText(/^(?:national ID|passport|PCCC|NIK|NPWP)(?: number)?$/i)).toBeNull();
    expect(screen.getByText(/exact shipment tracking reference/)).toBeTruthy();
  });

  it('restores a saved shipment reference for subsequent review', () => {
    render(createElement(RecipientEvidenceFields, { country: 'CN', evidence: { ...evidence, shipmentReference: 'SAMPLE-SAVED-AWB' } }));
    expect(screen.getByLabelText(/^Reviewed shipment \/ airwaybill reference/)).toHaveProperty('value', 'SAMPLE-SAVED-AWB');
  });

  it('does not imply a blanket shipment authorization requirement for a different destination', () => {
    render(createElement(RecipientEvidenceFields, { country: 'JP', evidence: { ...evidence, method: 'NOT_REQUIRED' } }));
    expect(screen.queryByLabelText(/^Reviewed shipment \/ airwaybill reference/)).toBeNull();
  });
});
