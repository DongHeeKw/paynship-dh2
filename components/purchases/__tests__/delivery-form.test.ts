// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildStoredDeliveryProfile } from '@/lib/customs/delivery';
import DeliveryForm from '../DeliveryForm';

const transport = vi.hoisted(() => ({ request: vi.fn(), navigate: vi.fn() }));
vi.mock('../PurchaseClient', () => ({ usePurchaseClient: () => transport }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));

const stored = buildStoredDeliveryProfile({
  fullName: 'Sample Receiver', phone: '+819012345678', country: 'JP',
  address1: '1 Sample Street', address2: '', city: 'Tokyo', region: '', postalCode: '100-0001',
  customsId: '', customsIdType: 'NONE', customsAuthorization: 'NONE',
});

describe('delivery address editing', () => {
  beforeEach(() => { transport.request.mockReset(); transport.navigate.mockReset(); });
  afterEach(cleanup);

  it('blocks edits after a failed load so an unseen saved profile cannot be overwritten', async () => {
    transport.request.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({ profile: stored });
    render(createElement(DeliveryForm));
    await screen.findByRole('alert');
    expect(screen.queryByRole('form', { name: 'Delivery details' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save delivery details' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByDisplayValue('Sample Receiver');
    expect(transport.request).toHaveBeenCalledTimes(2);
    expect(transport.request.mock.calls.every(call => !call[1]?.method)).toBe(true);
  });

  it('previews edits without sending them until Save, then waits for server confirmation', async () => {
    const updated = { ...stored, fullName: 'Updated Receiver' };
    transport.request.mockResolvedValueOnce({ profile: stored }).mockResolvedValueOnce({ profile: updated });
    render(createElement(DeliveryForm));
    await screen.findByDisplayValue('Sample Receiver');
    fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: 'Updated Receiver' } });
    expect(screen.getByText('Updated Receiver').closest('aside')).not.toBeNull();
    expect(transport.request).toHaveBeenCalledTimes(1);
    fireEvent.submit(screen.getByRole('form', { name: 'Delivery details' }));
    await screen.findByText('Delivery details saved. Ready for your next request.');
    const options = transport.request.mock.calls[1][1];
    expect(options.method).toBe('PUT');
    const submitted = JSON.parse(options.body);
    expect(submitted.fullName).toBe('Updated Receiver');
    expect(submitted).not.toHaveProperty('customsVerification');
    expect(transport.navigate).not.toHaveBeenCalled();
  });

  it('keeps failed edits available and requires a separate confirmation before deletion', async () => {
    transport.request.mockResolvedValueOnce({ profile: stored }).mockRejectedValueOnce(new Error('Please try again.')).mockResolvedValueOnce({ ok: true });
    render(createElement(DeliveryForm));
    await screen.findByDisplayValue('Sample Receiver');
    fireEvent.change(screen.getByLabelText('Recipient name'), { target: { value: 'Unsaved Receiver' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Delivery details' }));
    await screen.findByRole('alert');
    expect(screen.getByDisplayValue('Unsaved Receiver')).toBeTruthy();
    expect(screen.queryByText('Delivery details saved. Ready for your next request.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete saved details' }));
    expect(transport.request).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Keep details' }));
    expect(transport.request).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Delete saved details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Delete saved details' })).toBeNull());
    expect(transport.request.mock.calls[2]).toEqual(['/api/delivery-profile', { method: 'DELETE' }]);
    expect(screen.getByLabelText('Recipient name')).toHaveProperty('value', '');
  });
});
