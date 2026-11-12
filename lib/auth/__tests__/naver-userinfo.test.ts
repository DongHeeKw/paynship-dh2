import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ limit: vi.fn(), local: vi.fn() }));
vi.mock('@upstash/redis', () => ({ Redis: class {} }));
vi.mock('@upstash/ratelimit', () => ({ Ratelimit: class { static slidingWindow() { return {}; } limit = mocks.limit; } }));
vi.mock('@/lib/api/rate-limiter', () => ({ checkRateLimit: mocks.local }));
import { GET } from '@/app/auth/naver/userinfo/route';
const request = (authorization = 'Bearer test-token') => new Request('https://paynship.example/auth/naver/userinfo', { headers: { authorization } });
const profile = { resultcode: '00', response: { id: 'naver-id', email: 'buyer@example.com', name: 'Do not expose', mobile: 'Do not expose', email_verified: true } };

describe('Naver userinfo adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NAVER_AUTH_ENABLED', 'true');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
    mocks.limit.mockResolvedValue({ success: true });
    mocks.local.mockResolvedValue({ allowed: true });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(profile)));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('returns only the upstream identity and unverified email, with no session or cache', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sub: 'naver-id', email: 'buyer@example.com', email_verified: false });
    expect(fetch).toHaveBeenCalledExactlyOnceWith('https://openapi.naver.com/v1/nid/me', expect.objectContaining({ redirect: 'error', cache: 'no-store', headers: { Authorization: 'Bearer test-token', Accept: 'application/json' } }));
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(JSON.stringify(mocks.limit.mock.calls)).not.toContain('test-token');
  });

  it('does not make any network requests while disabled', async () => {
    vi.stubEnv('NAVER_AUTH_ENABLED', 'false');
    expect((await GET(request())).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it.each(['', 'Basic test-token', 'Bearer token with spaces', `Bearer ${'a'.repeat(8193)}`])('rejects invalid credentials before fetching: %s', async header => {
    expect((await GET(request(header))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails closed when production Redis is missing, unavailable, or times out', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    expect((await GET(request())).status).toBe(503);
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test');
    mocks.limit.mockRejectedValueOnce(new Error('secret Redis credentials'));
    expect((await GET(request())).status).toBe(503);
    mocks.limit.mockResolvedValueOnce({ success: true, reason: 'timeout' });
    expect((await GET(request())).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.local).not.toHaveBeenCalled();
  });

  it('denies a shared quota overrun before contacting Naver', async () => {
    mocks.limit.mockResolvedValueOnce({ success: false, reset: Date.now() + 60000 });
    const response = await GET(request());
    expect(response.status).toBe(429);
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([{ ...profile, resultcode: '0000' }, { resultcode: '00', response: { id: 'id' } }, { resultcode: '00', response: { id: '', email: 'buyer@example.com' } }])('rejects unsuccessful or incomplete profiles', async body => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(body));
    expect((await GET(request())).status).toBe(502);
  });

  it('rejects oversized responses even without a content-length header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(' '.repeat(16385), { headers: { 'Content-Type': 'application/json' } }));
    expect((await GET(request())).status).toBe(502);
  });

  it('bounds a hanging upstream request and returns no sensitive error details', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockReturnValueOnce(new Promise(() => {}));
    const result = GET(request());
    await vi.advanceTimersByTimeAsync(5001);
    const response = await result;
    expect(response.status).toBe(504);
    expect(await response.text()).toBe('{"error":"Naver sign-in could not be completed."}');
  });
});
