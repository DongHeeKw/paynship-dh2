import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn(() => { throw new Error('Preview must not load real auth'); }) }));
import { middleware } from '@/middleware';
afterEach(() => vi.unstubAllEnvs());
describe('consolidation preview middleware boundary', () => {
  it.each([
    ['development', '1', 'localhost:3000', 200],
    ['production', '1', 'localhost:3000', 404],
    ['development', '', 'localhost:3000', 404],
    ['development', '1', 'public.example', 404],
  ])('%s flag=%s host=%s returns %s', async (mode, flag, host, status) => {
    vi.stubEnv('NODE_ENV', mode); vi.stubEnv('PAYNSHIP_DEV_PREVIEW', flag);
    const response = await middleware(new NextRequest('http://localhost:3000/dev/consolidation', { headers: { host } }));
    expect(response.status).toBe(status);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
