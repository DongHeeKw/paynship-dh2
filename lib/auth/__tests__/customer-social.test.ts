import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient as createSupabaseClient, type Provider } from '@supabase/supabase-js';

const mocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: mocks }) }));
import { getCustomerSocialProviderStatus, startCustomerSocialSignIn, type CustomerSocialProvider } from '../customer-social';

describe('customer social sign in', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.example');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
    vi.stubEnv('NEXT_PUBLIC_APPLE_AUTH_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_NAVER_AUTH_ENABLED', 'true');
    vi.stubGlobal('window', { location: { origin: 'https://paynship.example' } });
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it.each([['google', 'google'], ['apple', 'apple'], ['naver', 'custom:naver']] as const)('starts %s with the safe return path', async (provider, sdkProvider) => {
    await startCustomerSocialSignIn(provider, '/settings/delivery');
    expect(mocks.signInWithOAuth).toHaveBeenCalledExactlyOnceWith({ provider: sdkProvider, options: { redirectTo: 'https://paynship.example/auth/callback?next=%2Fsettings%2Fdelivery' } });
  });

  it('never forwards an external return URL or an unsupported provider', async () => {
    await startCustomerSocialSignIn('apple', '//outside.example');
    expect(mocks.signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe('https://paynship.example/auth/callback?next=%2F');
    await expect(startCustomerSocialSignIn('custom:untrusted' as CustomerSocialProvider)).rejects.toThrow('supported sign-in');
    expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1);
  });

  it.each(['false', '', '1', 'TRUE'])('keeps unconfigured Apple/Naver disabled for flag %s', async flag => {
    vi.stubEnv('NEXT_PUBLIC_APPLE_AUTH_ENABLED', flag);
    vi.stubEnv('NEXT_PUBLIC_NAVER_AUTH_ENABLED', flag);
    expect(getCustomerSocialProviderStatus('google').available).toBe(true);
    for (const provider of ['apple', 'naver'] as const) {
      expect(getCustomerSocialProviderStatus(provider).available).toBe(false);
      await expect(startCustomerSocialSignIn(provider)).rejects.toThrow('coming soon');
    }
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('refuses insecure origins and missing auth configuration before contacting a provider', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://192.168.1.2' } });
    await expect(startCustomerSocialSignIn('google')).rejects.toThrow('HTTPS');
    vi.stubGlobal('window', { location: { origin: 'https://paynship.example' } });
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    await expect(startCustomerSocialSignIn('apple')).rejects.toThrow('not configured');
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('reports a recoverable provider-specific error without leaking provider responses', async () => {
    mocks.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'sensitive provider token' } });
    await expect(startCustomerSocialSignIn('apple')).rejects.toThrow('Apple sign-in could not start. Please try again or choose another option.');
    mocks.signInWithOAuth.mockRejectedValueOnce(new Error('sensitive credentials'));
    await expect(startCustomerSocialSignIn('naver')).rejects.toThrow('Naver sign-in could not start. Please try again or choose another option.');
  });

  it('the installed SDK preserves a custom provider and generates its PKCE challenge', async () => {
    const client = createSupabaseClient('https://project.example', 'test-public-key', { auth: { flowType: 'pkce', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await client.auth.signInWithOAuth({ provider: 'custom:naver' as Provider, options: { skipBrowserRedirect: true, redirectTo: 'https://paynship.example/auth/callback?next=%2Forders' } });
    expect(error).toBeNull();
    const url = new URL(data.url!);
    expect(url.origin).toBe('https://project.example');
    expect(url.pathname).toBe('/auth/v1/authorize');
    expect(url.searchParams.get('provider')).toBe('custom:naver');
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
