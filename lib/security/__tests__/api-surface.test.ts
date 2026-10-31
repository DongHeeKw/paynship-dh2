import { describe, expect, it } from 'vitest';
import { isActiveApiPath } from '../api-surface';

describe('public API surface', () => {
  it.each(['/api/purchases', '/api/delivery-profile', '/api/admin/purchases/861e6b97-ad93-44bc-a01c-0ee87f49af2b', '/api/webhooks/purchases', '/api/webhooks/shipping'])('allows the reviewed flow route %s', path => {
    expect(isActiveApiPath(path)).toBe(true);
  });
  it.each(['/api/webhooks/shopify', '/api/webhooks/shopify-v2', '/api/dev/flow-status', '/api/orders/123/cancel', '/api/preferences', '/api/cs/handoff', '/api/cron/cleanup', '/api/admin/users', '/api/purchases/123/override'])('retires routes that bypass the new boundary %s', path => {
    expect(isActiveApiPath(path)).toBe(false);
  });
});
