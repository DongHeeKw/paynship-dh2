import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  createOrderIntent,
  createPaymentRequest,
  listPaymentRequests,
  listOrderIntents,
  resetOrderIntakeMemoryStore,
  updateOrderIntent,
} from '../service';

describe('order intake service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOrderIntakeMemoryStore();
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('relation "order_intents" does not exist'));
  });

  it('creates and lists order intents via memory fallback', async () => {
    const created = await createOrderIntent({
      quoteId: 'quote-1',
      userId: 'user-1',
      sessionId: 'session-1',
      status: 'pending_review',
      quoteQuality: 'amber',
      checkoutEligible: false,
      totalUsd: 42,
      destinationCountry: 'US',
      acceptanceReason: 'estimate_requires_review',
    });

    const intents = await listOrderIntents({ userId: 'user-1' });

    expect(created.quoteId).toBe('quote-1');
    expect(created.status).toBe('pending_review');
    expect(intents).toHaveLength(1);
    expect(intents[0].id).toBe(created.id);
  });

  it('updates intent status and attaches payment request id', async () => {
    const created = await createOrderIntent({
      quoteId: 'quote-2',
      userId: 'user-2',
      status: 'pending_review',
      quoteQuality: 'red',
      checkoutEligible: false,
      totalUsd: 55,
    });

    const paymentRequest = await createPaymentRequest({
      orderIntentId: created.id,
      quoteId: created.quoteId,
      userId: created.userId,
      amountUsd: 60,
    });

    const updated = await updateOrderIntent(created.id, {
      status: 'accepted',
      acceptanceReason: 'ops_accepted_after_review',
      paymentRequestId: paymentRequest.id,
    });

    expect(updated?.status).toBe('accepted');
    expect(updated?.paymentRequestId).toBe(paymentRequest.id);
    expect(paymentRequest.amountUsd).toBe(60);
    expect((await listPaymentRequests({ quoteId: created.quoteId })).length).toBe(1);
  });
});
