/**
 * Checkout configuration utilities.
 *
 * Shared helpers used by both the checkout API and mock-complete API.
 */

import { getAdminSettings } from '@/lib/admin';

function parseEnvMockCheckoutFlag(): boolean {
  const raw = process.env.ENABLE_MOCK_CHECKOUT;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export async function isMockCheckoutEnabled(): Promise<boolean> {
  const envFallback = parseEnvMockCheckoutFlag();
  try {
    const settings = await getAdminSettings();
    return settings.useMockCheckout ?? envFallback;
  } catch {
    return envFallback;
  }
}
