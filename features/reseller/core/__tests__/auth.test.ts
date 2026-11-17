import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
import { resellerUser } from '../auth';
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-key');
  mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'verified-owner', email: 'test@example.com', email_confirmed_at: '2026-11-15' } }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
it('checks the bearer with Auth and returns only the verified owner', async () => {
  expect((await resellerUser(new Request('https://example.com', { headers: { authorization: 'Bearer test-token' } }))).id).toBe('verified-owner');
  expect(mocks.getUser).toHaveBeenCalledWith('test-token');
  expect(mocks.createClient).toHaveBeenCalledWith(expect.any(String), 'public-key', expect.objectContaining({ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
});
it.each(['', 'Basic test', 'Bearer ', 'Bearer x y', 'Bearer ' + 'x'.repeat(8193)])('rejects malformed credentials before Auth: %.20s', async authorization => {
  await expect(resellerUser(new Request('https://example.com', { headers: { authorization } }))).rejects.toMatchObject({ status: 401 });
  expect(mocks.getUser).not.toHaveBeenCalled();
});
// Independent condition pairs against the successful baseline above.
it.each([
  { error: { message: 'invalid' }, data: { user: { email: 'a@b.test', email_confirmed_at: 'date' } } },
  { error: null, data: { user: null } },
  { error: null, data: { user: { email_confirmed_at: 'date' } } },
  { error: null, data: { user: { email: 'a@b.test' } } },
])('fails closed for unverified Auth result %#', async result => {
  mocks.getUser.mockResolvedValue(result);
  await expect(resellerUser(new Request('https://example.com', { headers: { authorization: 'Bearer test-token' } }))).rejects.toMatchObject({ status: 401 });
});
it.each(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])('rejects missing %s configuration', async name => {
  vi.stubEnv(name, '');
  await expect(resellerUser(new Request('https://example.com', { headers: { authorization: 'Bearer test-token' } }))).rejects.toMatchObject({ status: 503 });
});
