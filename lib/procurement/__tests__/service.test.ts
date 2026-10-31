import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  createProcurementBatch,
  createProcurementTask,
  listProcurementBatches,
  resetProcurementMemoryStore,
  updateProcurementTask,
} from '../service';

describe('procurement service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProcurementMemoryStore();
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('relation "procurement_batches" does not exist'));
  });

  it('creates and lists procurement batches via memory fallback', async () => {
    const batch = await createProcurementBatch({
      sourceVendor: 'coupang',
      selectedSourceUrl: 'https://www.coupang.com/vp/products/1',
      orderIntentIds: ['intent-1', 'intent-2'],
    });

    const batches = await listProcurementBatches();

    expect(batch.orderIntentIds).toEqual(['intent-1', 'intent-2']);
    expect(batches).toHaveLength(1);
  });

  it('creates and updates procurement tasks via memory fallback', async () => {
    const task = await createProcurementTask({
      orderIntentId: 'intent-1',
      status: 'researching',
      availabilityStatus: 'unknown',
    });

    const updated = await updateProcurementTask(task.id, {
      status: 'ready_to_buy',
      selectedSourceUrl: 'https://www.coupang.com/vp/products/1',
      lowestPriceKrw: 12300,
      availabilityStatus: 'confirmed',
    });

    expect(updated?.status).toBe('ready_to_buy');
    expect(updated?.lowestPriceKrw).toBe(12300);
  });
});
