// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
const mock = vi.hoisted(() => ({ user: null as null | { id: string }, loading: false, request: vi.fn(), preview: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mock }));
vi.mock('@/components/purchases/PurchaseClient', () => ({ usePurchaseClient: () => mock }));
import { HomeOrdersProvider } from '../HomeOrdersProvider';
import OrdersOverview from '../OrdersOverview';
const data = { activeCount: 1, attentionCount: 1, orders: [{ id: 'owned', status: 'ON_HOLD', statusLabel: 'Needs attention', category: 'books', destination: 'JP', quantity: 1, needsAttention: true, updatedAt: '2026-11-22T00:00:00Z', lastEventAt: null, action: 'Check what needs attention' }] };
const view = () => <HomeOrdersProvider><OrdersOverview /></HomeOrdersProvider>;
afterEach(() => { cleanup(); vi.resetAllMocks(); mock.user = null; mock.preview = false; });
describe('active-order home', () => {
  it('does not request private orders for guests or local preview personas', () => {
    const mounted = render(view()); expect(mock.request).not.toHaveBeenCalled();
    mock.preview = true; mock.user = { id: 'preview' }; mounted.rerender(view()); expect(mock.request).not.toHaveBeenCalled();
  });
  it('shows actual statuses and pending ETA without invented events', async () => {
    mock.user = { id: 'A' }; mock.request.mockResolvedValue(data); render(view());
    expect(await screen.findByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('No recorded progress event yet.')).toBeTruthy();
    expect(screen.getByText('Delivery estimate pending')).toBeTruthy();
  });
  it('clears prior account data immediately and ignores late responses after sign-out', async () => {
    mock.user = { id: 'A' }; mock.request.mockResolvedValueOnce(data);
    const mounted = render(view()); await screen.findByText('Needs attention');
    let resolve!: (value: unknown) => void;
    mock.request.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    mock.user = { id: 'B' }; mounted.rerender(view());
    expect(screen.queryByText('Needs attention')).toBeNull();
    mock.user = null; mounted.rerender(view());
    await act(async () => resolve(data));
    expect(screen.queryByText('Needs attention')).toBeNull();
  });
  it('keeps discovery available when empty and distinguishes failure from no orders', async () => {
    mock.user = { id: 'A' }; mock.request.mockResolvedValueOnce({ ...data, activeCount: 0, attentionCount: 0, orders: [] });
    const mounted = render(view()); await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.queryByRole('region')).toBeNull();
    mock.user = { id: 'B' }; mock.request.mockRejectedValueOnce(new Error('offline')); mounted.rerender(view());
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
