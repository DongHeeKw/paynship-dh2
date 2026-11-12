import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: mocks }) }));
import { customerAuthOriginAllowed, signInWithEmail, signUpWithEmail } from '../customer-auth';

const credentials = { email: 'customer@example.com', password: 'secure-test-password' };
const verifiedUser = { email: credentials.email, email_confirmed_at: '2026-10-17T00:00:00.000Z' };

describe('email customer authentication', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.example');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key');
    vi.stubGlobal('window', { location: { origin: 'https://paynship.example', pathname: '/signup', search: '' } });
    mocks.signOut.mockResolvedValue({ error: null });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('passes credentials to the SDK and accepts only a verified session', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: verifiedUser, session: { user: verifiedUser } }, error: null });
    expect(await signInWithEmail({ ...credentials, email: ' customer@example.com ' })).toEqual({ status: 'authenticated' });
    expect(mocks.signInWithPassword).toHaveBeenCalledExactlyOnceWith(credentials);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('removes an unexpected unverified local session and never reports authentication', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { email: credentials.email }, session: { access_token: 'test-token' } }, error: null });
    expect(await signInWithEmail(credentials)).toMatchObject({ status: 'error' });
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  });

  it('does not accept a verified-looking user when the SDK has no session', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: verifiedUser, session: null }, error: null });
    expect(await signInWithEmail(credentials)).toMatchObject({ status: 'error' });
  });

  it('conceals credential errors and catches SDK or network failures', async () => {
    const sensitive = 'Customer customer@example.com does not exist in project secret-123';
    mocks.signInWithPassword.mockResolvedValueOnce({ data: { user: null, session: null }, error: { message: sensitive } });
    const invalid = await signInWithEmail(credentials);
    expect(invalid).toMatchObject({ status: 'error' });
    expect(JSON.stringify(invalid)).not.toContain(sensitive);
    mocks.signInWithPassword.mockRejectedValueOnce(new Error(sensitive));
    expect(JSON.stringify(await signInWithEmail(credentials))).not.toContain(sensitive);
  });

  it('requests email confirmation with a safe callback and preserves the destination', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { email: credentials.email }, session: null }, error: null });
    expect(await signUpWithEmail(credentials, '/settings/delivery')).toEqual({ status: 'confirmation' });
    expect(mocks.signUp).toHaveBeenCalledExactlyOnceWith({ ...credentials, options: { emailRedirectTo: 'https://paynship.example/auth/callback?next=%2Fsettings%2Fdelivery' } });
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('conceals an existing signup identity in the same confirmation result', async () => {
    mocks.signUp.mockResolvedValueOnce({ data: {}, error: { code: 'user_already_exists', message: 'Account exists' } });
    expect(await signUpWithEmail(credentials, '/orders')).toEqual({ status: 'confirmation' });
    mocks.signUp.mockResolvedValueOnce({ data: { user: { identities: [] }, session: null }, error: null });
    expect(await signUpWithEmail(credentials, '/orders')).toEqual({ status: 'confirmation' });
  });

  it('never trusts an unverified session returned during signup', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { email: credentials.email }, session: { access_token: 'test-token' } }, error: null });
    expect(await signUpWithEmail(credentials, '//outside.example')).toEqual({ status: 'confirmation' });
    expect(mocks.signUp.mock.calls[0][0].options.emailRedirectTo).toBe('https://paynship.example/auth/callback?next=%2F');
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  });

  it('accepts an immediately confirmed provider session only with the provider verified email field', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: verifiedUser, session: { user: verifiedUser } }, error: null });
    expect(await signUpWithEmail(credentials, '/orders')).toEqual({ status: 'authenticated' });
  });

  it('uses safe public signup errors for provider failures', async () => {
    mocks.signUp.mockRejectedValueOnce(new Error('smtp secret host and customer email'));
    expect(await signUpWithEmail(credentials, '/orders')).toEqual({ status: 'error', message: 'We couldn’t reach sign up. Please try again shortly.' });
    mocks.signUp.mockResolvedValueOnce({ data: {}, error: { code: 'unexpected_failure', message: 'internal provider error' } });
    const result = await signUpWithEmail(credentials, '/orders');
    expect(result).toMatchObject({ status: 'error' });
    expect(JSON.stringify(result)).not.toContain('internal provider error');
  });

  it('bounds credentials and refuses unconfigured authentication without SDK calls', async () => {
    for (const invalid of [{ ...credentials, email: 'invalid' }, { ...credentials, email: `${'a'.repeat(255)}@example.com` }, { ...credentials, password: 'a'.repeat(73) }, { ...credentials, password: 'short' }]) {
      expect(await signUpWithEmail(invalid, '/orders')).toMatchObject({ status: 'error' });
    }
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(await signInWithEmail(credentials)).toMatchObject({ status: 'error' });
    expect(await signUpWithEmail(credentials, '/orders')).toMatchObject({ status: 'error' });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('blocks both email actions on current non-loopback public HTTP before calling the provider', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://192.168.75.14' } });
    const expected = { status: 'error', message: 'Use the secure HTTPS address to sign in or create an account.' };
    expect(await signInWithEmail(credentials)).toEqual(expected);
    expect(await signUpWithEmail(credentials, '/orders')).toEqual(expected);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it.each(['https://paynship.example', 'https://192.168.75.14', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000'])('permits HTTPS and exact local development origins: %s', origin => {
    expect(customerAuthOriginAllowed(origin)).toBe(true);
  });

  it.each(['http://192.168.75.14', 'http://218.237.247.35:8080', 'http://localhost.example:3000', 'http://127.0.0.2', 'ftp://localhost', 'javascript:alert(1)', 'invalid', 'https://customer:password@paynship.example'])('rejects insecure and deceptive authentication origins: %s', origin => {
    expect(customerAuthOriginAllowed(origin)).toBe(false);
  });
});
