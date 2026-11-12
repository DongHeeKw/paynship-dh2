import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn(), getUser: vi.fn(), signOut: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: mocks }) }));
import { GET } from '@/app/auth/confirm/route';
const token = 'a'.repeat(64);
const request = (query = `token_hash=${token}&type=email&next=%2Fpurchase`) => new Request(`https://paynship.example/auth/confirm?${query}`);

describe('email confirmation route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    mocks.verifyOtp.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'buyer@example.com', email_confirmed_at: '2026-11-12' } }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('verifies the one-time email token and rechecks the server user before continuing', async () => {
    const response = await GET(request());
    expect(mocks.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: token, type: 'email' });
    expect(response.headers.get('location')).toBe('https://paynship.example/purchase');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it.each(['type=email', `token_hash=${token}&type=recovery`, `token_hash=${'a'.repeat(257)}&type=email`, 'token_hash=bad&invalid&type=email'])('rejects invalid confirmation input without an SDK call: %s', async query => {
    expect((await GET(request(query))).headers.get('location')).toContain('/login?error=callback');
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it('clears an unverified session instead of letting it reach private pages', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: { email: 'buyer@example.com' } }, error: null });
    const response = await GET(request());
    expect(response.headers.get('location')).toContain('/login?error=callback');
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  });

  it('handles expired and failed tokens without exposing credentials', async () => {
    mocks.verifyOtp.mockResolvedValueOnce({ error: { message: token } });
    expect((await GET(request())).headers.get('location')).toBe('https://paynship.example/login?error=callback&next=%2Fpurchase');
    mocks.verifyOtp.mockRejectedValueOnce(new Error(token));
    expect((await GET(request())).headers.get('location')).not.toContain(token);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('uses the configured production origin and rejects external next paths', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://production.example');
    const response = await GET(request(`token_hash=${token}&type=signup&next=https://untrusted.example`));
    expect(response.headers.get('location')).toBe('https://production.example/orders');
  });
});
