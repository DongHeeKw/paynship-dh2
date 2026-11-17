import { NextRequest, NextResponse } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ updateSession: vi.fn() }));
vi.mock('@/lib/supabase/middleware', () => ({ updateSession: mocks.updateSession }));
vi.mock('@upstash/redis', () => ({ Redis: class {} }));
vi.mock('@upstash/ratelimit', () => ({ Ratelimit: class { static slidingWindow() { return {}; } } }));

import { middleware } from '../../../../middleware';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('PAYNSHIP_DEV_PREVIEW', '1');
  mocks.updateSession.mockReset();
  mocks.updateSession.mockResolvedValue(NextResponse.next());
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('workspace middleware isolation', () => {
  it.each(['/dev/workspace', '/dev/workspace/data', '/dev/preview'])('hides %s in production despite forged local-preview headers', async path => {
    vi.stubEnv('NODE_ENV', 'production');
    const request = new NextRequest('http://127.0.0.1:3001' + path, { headers: { host: '127.0.0.1:3001', 'x-paynship-dev-preview': '1', 'x-forwarded-host': 'localhost:3001' } });
    const response = await middleware(request);
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it.each(['/dev/workspace', '/dev/workspace/data'])('rejects a public Host for %s even with a forged forwarded Host', async path => {
    const request = new NextRequest('http://public.example' + path, { headers: { host: 'public.example', 'x-forwarded-host': 'localhost:3001', 'x-paynship-dev-preview': '1' } });
    expect((await middleware(request)).status).toBe(404);
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it.each(['/dev/workspace', '/dev/workspace/data', '/dev/preview'])('forwards a trusted preview header only after the gate for %s', async path => {
    const request = new NextRequest('http://127.0.0.1:3001' + path, { headers: { host: '127.0.0.1:3001' } });
    const response = await middleware(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-request-x-paynship-dev-preview')).toBe('1');
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });

  it('removes forged preview headers on private pages and keeps ordinary production APIs blocked', async () => {
    const privatePage = new NextRequest('http://127.0.0.1:3001/orders', { headers: { host: '127.0.0.1:3001', 'x-paynship-dev-preview': '1' } });
    await middleware(privatePage);
    expect(privatePage.headers.has('x-paynship-dev-preview')).toBe(false);
    expect(mocks.updateSession).toHaveBeenCalledOnce();
    vi.stubEnv('NODE_ENV', 'production');
    const api = new NextRequest('http://127.0.0.1:3001/api/purchases', { headers: { host: '127.0.0.1:3001', 'x-paynship-dev-preview': '1' } });
    expect((await middleware(api)).status).toBe(503);
    expect(api.headers.has('x-paynship-dev-preview')).toBe(false);
  });
});
