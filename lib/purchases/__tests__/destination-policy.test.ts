import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { User } from '@supabase/supabase-js';
import { encryptPii } from '../pii';

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), available: vi.fn(), dto: vi.fn() }));
vi.mock('../transaction', () => ({ purchaseTransaction: mocks.transaction }));
vi.mock('../availability', () => ({ requirePurchasingAvailable: mocks.available }));
vi.mock('../quota', () => ({ consumeQuota: vi.fn() }));
vi.mock('../read', () => ({ purchaseDto: mocks.dto }));
import { createPurchase } from '../create';
import { saveDeliveryProfile } from '../profile';

const userId = randomUUID();
const profile = { fullName: 'Test Recipient', phone: '+819012345678', country: 'JP', address1: '1 Test Street', city: 'Test City', postalCode: '1000001' };
const input = { sourceUrl: 'https://www.yes24.com/Product/Goods/126045111', category: 'books', quantity: 1, options: '', idempotencyKey: randomUUID() };

describe('initial destination intake restriction', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('PII_ENCRYPTION_KEY', 'ab'.repeat(32));
    mocks.available.mockResolvedValue(undefined);
  });
  it('rejects a crafted profile update outside the supported intake scope before any DB mutation', async () => {
    await expect(saveDeliveryProfile({ id: userId, email: 'test@example.com' } as User, { ...profile, country: 'SG', postalCode: '048581' })).rejects.toMatchObject({ status: 422 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it.each([['CN', '100000'], ['JP', '1000001'], ['US', '10001'], ['VN', '100000'], ['TH', '10100'], ['PH', '1000'], ['ID', '10110']])('allows a new %s request only after reading its stored delivery destination', async (country, postalCode) => {
    const create = vi.fn().mockResolvedValue({ id: 'created-request' });
    const tx = {
      purchaseRequest: { findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null), create },
      deliveryProfile: { findUnique: vi.fn().mockResolvedValue({ encryptedData: encryptPii({ ...profile, country, postalCode }, `profile:${userId}`) }) },
    };
    mocks.transaction.mockImplementation(fn => fn(tx));
    await createPurchase(userId, input);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ destination: country }) }));
  });
  it('preserves an older saved profile but refuses to create a new request for its out-of-scope destination', async () => {
    const create = vi.fn();
    const tx = {
      purchaseRequest: { findUnique: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null), create },
      deliveryProfile: { findUnique: vi.fn().mockResolvedValue({ encryptedData: encryptPii({ ...profile, country: 'SG', postalCode: '048581' }, `profile:${userId}`) }) },
    };
    mocks.transaction.mockImplementation(fn => fn(tx));
    await expect(createPurchase(userId, input)).rejects.toMatchObject({ status: 422 });
    expect(create).not.toHaveBeenCalled();
  });
});
