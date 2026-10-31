import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
const transaction = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db/prisma', () => ({ prisma: { $transaction: transaction } }));
import { purchaseTransaction } from '../transaction';
import { consumeQuota } from '../quota';

beforeEach(() => { transaction.mockReset(); });
describe('durable concurrency boundaries', () => {
  it('bounds serialization conflict retries instead of retrying indefinitely', async () => {
    transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('serialization conflict', { code: 'P2034', clientVersion: 'unit-test' }));
    await expect(purchaseTransaction(async () => 'unused')).rejects.toMatchObject({ status: 409 });
    expect(transaction).toHaveBeenCalledTimes(3);
  });
  it('does not retry unknown database failures', async () => {
    transaction.mockRejectedValue(new Error('database unavailable'));
    await expect(purchaseTransaction(async () => 'unused')).rejects.toThrow('database unavailable');
    expect(transaction).toHaveBeenCalledOnce();
  });
  it('uses serializable isolation and a finite transaction timeout', async () => {
    transaction.mockResolvedValue('result');
    expect(await purchaseTransaction(async () => 'result')).toBe('result');
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable', timeout: 10000 });
  });
  it('rejects a quota update that did not reserve capacity', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await expect(consumeQuota({ $queryRaw: query } as unknown as Prisma.TransactionClient, 'submit:verified-user', 20)).rejects.toMatchObject({ status: 429 });
  });
});
