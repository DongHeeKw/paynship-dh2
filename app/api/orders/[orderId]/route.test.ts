import { describe, it, expect } from 'vitest';
import { PATCH } from './route';

describe('PATCH /api/orders/[orderId]', () => {
  it('returns 405 and redirects mutation to admin endpoint', async () => {
    const request = new Request('http://localhost/api/orders/order-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SHIPPED' }),
    }) as any;

    const response = await PATCH(request, {
      params: Promise.resolve({ orderId: 'order-1' }),
    });
    const json = await response.json();

    expect(response.status).toBe(405);
    expect(json.code).toBe('ORDER_PATCH_ADMIN_API_ONLY');
    expect(json.orderId).toBe('order-1');
  });
});
