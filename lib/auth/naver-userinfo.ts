// Server-only adapter: imported by the Node route, never by client components.
import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/api/rate-limiter';

const USERINFO_URL = 'https://openapi.naver.com/v1/nid/me';
const MAX_TOKEN_BYTES = 8 * 1024;
const MAX_RESPONSE_BYTES = 16 * 1024;
const UPSTREAM_TIMEOUT_MS = 5_000;
const GLOBAL_LIMIT = 60;
const TOKEN_LIMIT = 6;

const profileSchema = z.object({
  resultcode: z.literal('00'),
  response: z.object({
    id: z.string().min(1).max(255).regex(/^[\x21-\x7e]+$/),
    email: z.string().trim().max(254).email(),
  }),
});

class UserinfoError extends Error {
  constructor(readonly status: number, readonly retryAfter?: number) {
    super('Naver sign-in could not be completed.');
  }
}

function jsonResponse(body: object, status = 200, retryAfter?: number): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Pragma: 'no-cache',
      Vary: 'Authorization',
      'X-Content-Type-Options': 'nosniff',
      ...(status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}),
      ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}),
    },
  });
}

function readToken(request: Request): string {
  const header = request.headers.get('authorization');
  // RFC 6750 bearer syntax. Tokens remain in this request only; never log or persist them.
  if (!header || header.length > MAX_TOKEN_BYTES + 7) throw new UserinfoError(401);
  const match = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i.exec(header);
  if (!match || match[1].length > MAX_TOKEN_BYTES) throw new UserinfoError(401);
  return match[1];
}

async function enforceQuota(token: string): Promise<void> {
  const fingerprint = createHash('sha256').update(token).digest('hex');
  const keys = [
    { key: 'global', limit: GLOBAL_LIMIT },
    { key: `token:${fingerprint}`, limit: TOKEN_LIMIT },
  ];
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !redisToken) {
    if (process.env.NODE_ENV === 'production') throw new UserinfoError(503);
    // Local development only. Production never uses the legacy helper's fallback.
    for (const entry of keys) {
      const result = await checkRateLimit(`naver-userinfo:${entry.key}`, { maxTokens: entry.limit, windowMs: 60_000 });
      if (!result.allowed) throw new UserinfoError(429, Math.max(1, Math.ceil((result.retryAfterMs ?? 60_000) / 1000)));
    }
    return;
  }

  try {
    const redis = new Redis({ url, token: redisToken, retry: { retries: 0 } });
    for (const entry of keys) {
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(entry.limit, '1 m'),
        prefix: `paynship:naver-userinfo:${entry.limit}`,
        analytics: false,
        ephemeralCache: false,
        timeout: 1_000,
      });
      const result = await limiter.limit(entry.key);
      // Upstash's timeout response can have success=true. Never allow that fallback.
      if (result.reason === 'timeout') throw new UserinfoError(503);
      if (!result.success) throw new UserinfoError(429, Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)));
    }
  } catch (error) {
    if (error instanceof UserinfoError) throw error;
    throw new UserinfoError(503);
  }
}

async function fetchProfile(token: string) {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      void reader?.cancel().catch(() => {});
      reject(new UserinfoError(504));
    }, UPSTREAM_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(USERINFO_URL, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          cache: 'no-store',
          redirect: 'error',
          signal: controller.signal,
        });
        if (!response.ok) {
          void response.body?.cancel().catch(() => {});
          throw new UserinfoError(response.status === 401 || response.status === 403 ? 401 : 502);
        }
        const contentLength = response.headers.get('content-length');
        if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_RESPONSE_BYTES)) {
          void response.body?.cancel().catch(() => {});
          throw new UserinfoError(502);
        }
        if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body) {
          void response.body?.cancel().catch(() => {});
          throw new UserinfoError(502);
        }

        reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES) {
            void reader.cancel().catch(() => {});
            throw new UserinfoError(502);
          }
          chunks.push(value);
        }
        const body = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
          body.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const profile = profileSchema.safeParse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)));
        if (!profile.success) throw new UserinfoError(502);
        return {
          sub: profile.data.response.id,
          email: profile.data.response.email,
          // Naver's profile API provides no verified-email claim. Supabase must verify it.
          email_verified: false,
        };
      })(),
      timeout,
    ]);
  } catch (error) {
    if (error instanceof UserinfoError) throw error;
    throw new UserinfoError(controller.signal.aborted ? 504 : 502);
  } finally {
    if (timer) clearTimeout(timer);
    reader?.releaseLock();
  }
}

export async function handleNaverUserinfo(request: Request): Promise<Response> {
  if (process.env.NAVER_AUTH_ENABLED !== 'true') return jsonResponse({ error: 'Not found.' }, 404);
  try {
    const token = readToken(request);
    await enforceQuota(token);
    return jsonResponse(await fetchProfile(token));
  } catch (error) {
    const failure = error instanceof UserinfoError ? error : new UserinfoError(502);
    return jsonResponse({ error: failure.message }, failure.status, failure.retryAfter);
  }
}
