// @vitest-environment jsdom
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceData, SampleRequest } from '@/features/workspace/core/types';
import DeveloperWorkspace from '../DeveloperWorkspace';

const customers: WorkspaceData['customers'] = [
  { id: 'sample-customer-jp', name: 'SAMPLE Hana Mori', email: 'hana@example.invalid', country: 'JP', sampleOnly: true },
  { id: 'sample-customer-us', name: 'SAMPLE Alex Morgan', email: 'alex@example.invalid', country: 'US', sampleOnly: true },
];
const request: SampleRequest = {
  id: '5f824be4-a67e-4e4f-9e1c-6384ff175ef1', sourceUrl: 'https://smartstore.naver.com/sample/products/1234567',
  category: 'household', quantity: 1, options: 'SAMPLE estimate: 300 ml', destination: 'JP', status: 'QUOTED', statusLabel: 'Quote ready', version: 0,
  paymentReceived: false, checkoutAvailable: true, quoteExpiresAt: null, carrier: null, trackingNumber: null,
  createdAt: '2026-10-18T00:00:00.000Z', updatedAt: '2026-10-18T00:00:00.000Z', events: [], tickets: [], fulfilmentStarted: false,
  sampleOnly: true, productId: 'sample-naver-cup', productName: 'Estimated Sierra cup', estimatedPriceKrw: 28000, observedPriceKrw: null, hsCode: null,
  quote: { currency: 'USD', productName: 'Estimated Sierra cup', productCents: 2000, domesticShippingCents: 200, serviceFeeCents: 500,
    internationalShippingCents: 1800, insuranceCents: 100, dutyCents: null, taxCents: null, totalCents: 4600, subtotalCents: 4600,
    exchangeRateKrwPerUsd: 1400, quoteVersion: 1, sampleOnly: true, customsStatus: 'UNKNOWN' },
};

function workspace(customerId = customers[0].id): WorkspaceData {
  return { sampleOnly: true, notice: 'Local fictional customer workspace.', customers, customer: customers.find(customer => customer.id === customerId)!, products: [],
    account: { currency: 'USD', balanceCents: 10000, sampleOnly: true }, creditEntries: [], payments: [], requests: [request], deliveries: [], fixtureVersion: 1,
    deliveryProfile: { fullName: 'SAMPLE Hana Mori', phone: '+12025550101', country: 'JP', address1: 'SAMPLE ONLY - DO NOT SHIP', address2: '', city: 'Sample City JP', region: 'Sample Region JP', postalCode: '000-0000', customsId: '', customsIdType: 'NONE', customsAuthorization: 'NONE' } };
}
const fetchMock = vi.fn();
beforeEach(() => { sessionStorage.clear(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const response = (data: WorkspaceData) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('persistent developer customer workspace', () => {
  it('restores only the saved sample persona before its first data request and greets the customer by name', async () => {
    sessionStorage.setItem('paynship:workspace:ghost', 'sample-customer-us');
    fetchMock.mockResolvedValueOnce(response(workspace('sample-customer-us')));
    render(createElement(DeveloperWorkspace));
    await screen.findByText('WELCOME BACK, ALEX');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/dev/workspace/data?customerId=sample-customer-us');
    expect(screen.getByLabelText('Sample customer')).toHaveProperty('value', 'sample-customer-us');
  });

  it('uses the default sample persona when session storage is blocked', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage unavailable'); });
    fetchMock.mockResolvedValueOnce(response(workspace()));
    render(createElement(DeveloperWorkspace));
    await screen.findByText('WELCOME BACK, HANA');
    expect(fetchMock.mock.calls[0][0]).toBe('/dev/workspace/data?customerId=sample-customer-jp');
    getItem.mockRestore();
  });

  it('ignores an unknown saved identity and persists only an allowed ghost ID when switching accounts', async () => {
    sessionStorage.setItem('paynship:workspace:ghost', 'untrusted-user');
    fetchMock.mockResolvedValueOnce(response(workspace())).mockResolvedValueOnce(response(workspace('sample-customer-us')));
    render(createElement(DeveloperWorkspace));
    await screen.findByText('WELCOME BACK, HANA');
    fireEvent.change(screen.getByLabelText('Sample customer'), { target: { value: 'sample-customer-us' } });
    await screen.findByText('WELCOME BACK, ALEX');
    expect(sessionStorage.getItem('paynship:workspace:ghost')).toBe('sample-customer-us');
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['/dev/workspace/data?customerId=sample-customer-jp', '/dev/workspace/data?customerId=sample-customer-us']);
  });

  it('keeps unknown duty and tax out of the sample subtotal and prevents duplicate payment clicks', async () => {
    fetchMock.mockResolvedValueOnce(response(workspace()));
    let completePayment!: (result: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { completePayment = resolve; }));
    render(createElement(DeveloperWorkspace));
    await screen.findByText('WELCOME BACK, HANA');
    fireEvent.click(screen.getByRole('button', { name: /^My orders/ }));
    expect(screen.getAllByText('Pending review')).toHaveLength(2);
    expect(screen.getByText('Excludes unknown duty & tax')).toBeTruthy();
    const pay = screen.getByRole('button', { name: 'Pay $46.00 with sample credit' });
    fireEvent.click(pay); fireEvent.click(pay);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const submitted = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(submitted).toMatchObject({ action: 'pay', customerId: 'sample-customer-jp', requestId: request.id, version: 0 });
    expect(submitted.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
    const updated = workspace(); updated.account.balanceCents = 5400;
    updated.requests = [{ ...request, status: 'PAID', statusLabel: 'Paid', paymentReceived: true, version: 1 }];
    completePayment(response(updated));
    await screen.findByText('Paid with sample credit');
    expect(screen.queryByRole('button', { name: 'Pay $46.00 with sample credit' })).toBeNull();
  });

  it('keeps the delivery country tied to its ghost account and explains fictional address requirements', async () => {
    fetchMock.mockResolvedValueOnce(response(workspace()));
    render(createElement(DeveloperWorkspace));
    await screen.findByText('WELCOME BACK, HANA');
    fireEvent.click(screen.getByRole('button', { name: 'My account' }));
    expect(screen.getByLabelText(/^Country/)).toHaveProperty('disabled', true);
    expect(screen.getByText('Switch ghost accounts to try another destination.')).toBeTruthy();
    expect(screen.getByText(/Keep SAMPLE at the start/)).toBeTruthy();
    expect(screen.getByLabelText('Recipient name')).toHaveProperty('value', 'SAMPLE Hana Mori');
  });
});
