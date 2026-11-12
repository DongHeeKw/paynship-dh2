import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), getUser: vi.fn(), signOut: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: mocks }) }));
import { GET } from '@/app/auth/callback/route';

describe('customer confirmation and OAuth callback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'customer@example.com', email_confirmed_at: '2026-10-17' } }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('exchanges the code and rechecks the verified user before continuing to the safe destination', async () => {
    const response = await GET(new Request('https://paynship.example/auth/callback?code=valid-code&next=%2Fsettings%2Fdelivery'));
    expect(response.headers.get('location')).toBe('https://paynship.example/settings/delivery');
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('valid-code');
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it('discards an external redirect even after successful authentication', async () => {
    const response = await GET(new Request('https://paynship.example/auth/callback?code=valid-code&next=https%3A%2F%2Foutside.example'));
    expect(response.headers.get('location')).toBe('https://paynship.example/');
  });

  it('rejects unverified users after exchange and carries the intended safe path into the error screen', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { email: 'customer@example.com' } }, error: null });
    const response = await GET(new Request('https://paynship.example/auth/callback?code=valid-code&next=%2Fpurchase'));
    expect(response.headers.get('location')).toBe('https://paynship.example/login?error=callback&next=%2Fpurchase');
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  });

  it('returns safe callback errors for expired codes, network errors and provider errors', async () => {
    mocks.exchangeCodeForSession.mockRejectedValueOnce(new Error('Sensitive provider response'));
    const response = await GET(new Request('https://paynship.example/auth/callback?code=expired&next=%2Forders'));
    expect(response.headers.get('location')).toBe('https://paynship.example/login?error=callback&next=%2Forders');
    const providerError = await GET(new Request('https://paynship.example/auth/callback?error=denied&code=unused&next=%2Forders'));
    expect(providerError.headers.get('location')).toBe('https://paynship.example/login?error=callback&next=%2Forders');
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('uses the configured app origin in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://paynship.example');
    const response = await GET(new Request('https://proxy.invalid/auth/callback?code=valid-code&next=%2Forders'));
    expect(response.headers.get('location')).toBe('https://paynship.example/orders');
  });

  it('shows email verification guidance without treating an OAuth error as authentication', async () => {
    const response = await GET(new Request('https://paynship.example/auth/callback?error=access_denied&error_code=provider_email_needs_verification&error_description=sensitive&code=unused&next=%2Fpurchase'));
    expect(response.headers.get('location')).toBe('https://paynship.example/login?notice=confirm-email&next=%2Fpurchase');
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});
