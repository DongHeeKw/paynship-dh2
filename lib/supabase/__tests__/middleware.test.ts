import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ create: vi.fn(), user: vi.fn() }));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.create }));
import { updateSession } from '../middleware';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'unit-test-key');
  mocks.create.mockReturnValue({ auth: { getUser: mocks.user } });
});
afterEach(() => { vi.unstubAllEnvs(); });
describe('optional public session refresh', () => {
  it('allows public information without an Auth project and supplies no fake user', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const response = await updateSession(new NextRequest('http://localhost:3000/purchase'));
    expect(response.status).toBe(200); expect(mocks.create).not.toHaveBeenCalled();
    expect(response.cookies.getAll()).toEqual([]);
  });
  it('does not turn an Auth outage into a public-page outage or a synthetic session', async () => {
    mocks.user.mockRejectedValue(new Error('auth unavailable'));
    const response = await updateSession(new NextRequest('http://localhost:3000/purchase'));
    expect(mocks.user).toHaveBeenCalledOnce(); expect(response.cookies.getAll()).toEqual([]);
  });
});
