import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ receipt: vi.fn(), find: vi.fn(), update: vi.fn(), event: vi.fn(), save: vi.fn() }));
vi.mock('../transaction', () => ({ purchaseTransaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
  purchaseWebhookReceipt: { findUnique: mock.receipt, create: mock.save },
  purchaseRequest: { findUnique: mock.find, update: mock.update }, purchaseEvent: { create: mock.event },
}) }));
import { applyShipmentEvent } from '../shipment-event';
const requestId = '861e6b97-ad93-44bc-a01c-0ee87f49af2b';
function event(carrier = 'Carrier One') { return { eventId: '123', requestId, carrier, trackingNumber: 'TRACK123', status: 'DELIVERED', occurredAt: new Date().toISOString(), sentAt: new Date().toISOString() }; }
function row(carrier = 'Carrier One') { return { id: requestId, carrier, trackingNumber: 'TRACK123', paidAt: new Date(), status: 'SHIPPED', createdAt: new Date(Date.now() - 86400000), lastCarrierEventAt: null }; }
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('PII_ENCRYPTION_KEY', 'a'.repeat(64)); mock.receipt.mockResolvedValue(null); mock.find.mockResolvedValue(row()); });
afterEach(() => vi.unstubAllEnvs());
describe('carrier event boundaries', () => {
  it('keeps same event IDs from separate carriers distinct', async () => {
    await applyShipmentEvent(event()); mock.find.mockResolvedValue(row('Carrier Two')); await applyShipmentEvent(event('Carrier Two'));
    expect(mock.save.mock.calls[0][0].data.id).not.toBe(mock.save.mock.calls[1][0].data.id);
  });
  it('rejects events for another assigned tracking number', async () => {
    await expect(applyShipmentEvent({ ...event(), trackingNumber: 'WRONG123' })).rejects.toMatchObject({ status: 409 });
    expect(mock.update).not.toHaveBeenCalled();
  });
  it('does not roll delivered status back when an exception arrives later', async () => {
    mock.find.mockResolvedValue({ ...row(), status: 'DELIVERED' });
    await applyShipmentEvent({ ...event(), status: 'EXCEPTION' });
    expect(mock.update.mock.calls[0][0].data.status).toBe('DELIVERED');
  });
  it('ignores an older carrier event after a newer delivery event', async () => {
    mock.find.mockResolvedValue({ ...row(), status: 'DELIVERED', lastCarrierEventAt: new Date(Date.now() + 1000) });
    await applyShipmentEvent(event()); expect(mock.update).not.toHaveBeenCalled(); expect(mock.save).toHaveBeenCalledOnce();
  });
  it('records a distinct delivery confirmation at the last scan timestamp once, then ignores its retry', async () => {
    const stored = row();
    const receipts = new Set<string>();
    mock.find.mockImplementation(async () => ({ ...stored }));
    mock.update.mockImplementation(async ({ data }) => { Object.assign(stored, data); return stored; });
    mock.receipt.mockImplementation(async ({ where }) => receipts.has(where.id) ? { id: where.id } : null);
    mock.save.mockImplementation(async ({ data }) => { receipts.add(data.id); return data; });
    const occurredAt = new Date(Date.now() - 1000).toISOString();
    const scan = { ...event(), eventId: 'scan-1', status: 'IN_TRANSIT', occurredAt };
    const delivered = { ...scan, eventId: 'scan-2', status: 'DELIVERED' };
    await applyShipmentEvent(scan);
    expect(stored.status).toBe('SHIPPED');
    await applyShipmentEvent(delivered);
    expect(stored.status).toBe('DELIVERED');
    expect(stored.lastCarrierEventAt).toEqual(new Date(occurredAt));
    await applyShipmentEvent(delivered);
    expect(stored.status).toBe('DELIVERED');
    expect(mock.update).toHaveBeenCalledTimes(2);
    expect(mock.event).toHaveBeenCalledTimes(2);
    expect(mock.event.mock.calls[1][0].data).toMatchObject({ status: 'DELIVERED', source: 'carrier_gateway' });
    expect(mock.save).toHaveBeenCalledTimes(2);
    expect(receipts.size).toBe(2);
  });
  it('does not accept a delivery confirmation older than the last scan', async () => {
    const occurredAt = new Date(Date.now() - 2000).toISOString();
    mock.find.mockResolvedValue({ ...row(), lastCarrierEventAt: new Date(Date.now() - 1000) });
    await applyShipmentEvent({ ...event(), occurredAt });
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.event).not.toHaveBeenCalled();
    expect(mock.save).toHaveBeenCalledOnce();
  });
  it('does not infer ordering for nonterminal statuses sharing the last scan timestamp', async () => {
    const occurredAt = new Date(Date.now() - 1000).toISOString();
    mock.find.mockResolvedValue({ ...row(), lastCarrierEventAt: new Date(occurredAt) });
    await applyShipmentEvent({ ...event(), status: 'EXCEPTION', occurredAt });
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.event).not.toHaveBeenCalled();
    expect(mock.save).toHaveBeenCalledOnce();
  });
});
