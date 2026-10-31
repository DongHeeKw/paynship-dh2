import { beforeEach, describe, expect, it, vi } from 'vitest';
const find = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/prisma', () => ({ prisma: { adminSettings: { findFirst: find } } }));
import { requirePurchasingAvailable } from '../availability';

beforeEach(() => { find.mockReset(); });
describe('operational request gates', () => {
  it('requires configured service settings instead of accepting with fallback values', async () => {
    find.mockResolvedValue(null); await expect(requirePurchasingAvailable()).rejects.toMatchObject({ status: 503 });
  });
  it('pauses both new requests and payments during maintenance', async () => {
    find.mockResolvedValue({ maintenanceMode: true, shopifyEnabled: true, useMockCheckout: false });
    await expect(requirePurchasingAvailable()).rejects.toMatchObject({ status: 503 });
    await expect(requirePurchasingAvailable(true)).rejects.toMatchObject({ status: 503 });
  });
  it('does not accept disabled or simulated payment providers', async () => {
    for (const settings of [{ shopifyEnabled: false, useMockCheckout: false }, { shopifyEnabled: true, useMockCheckout: true }]) {
      find.mockResolvedValue({ maintenanceMode: false, ...settings });
      await expect(requirePurchasingAvailable(true)).rejects.toMatchObject({ status: 503 });
    }
  });
  it('lets requests wait for review while payments are disabled', async () => {
    find.mockResolvedValue({ maintenanceMode: false, shopifyEnabled: false, useMockCheckout: false });
    await expect(requirePurchasingAvailable()).resolves.toBeUndefined();
  });
});
