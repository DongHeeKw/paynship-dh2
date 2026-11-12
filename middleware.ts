import { NextResponse, type NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { updateSession } from '@/lib/supabase/middleware';
import { isTrustedMutation } from '@/lib/security/csrf';
import { securityHeaders } from '@/lib/security/response-headers';
import { isActiveApiPath } from '@/lib/security/api-surface';
import { devPreviewAllowed } from '@/lib/dev-preview/access';

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }) : null;
const limiter = redis ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'paynship:api' }) : null;

export async function middleware(request: NextRequest) {
  // Client-supplied preview headers never suppress a real session check.
  request.headers.delete('x-paynship-dev-preview');
  const development = process.env.NODE_ENV !== 'production';
  const nonce = development ? undefined : btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(18))));
  if (nonce) {
    const forwarded = new Headers();
    securityHeaders(forwarded, false, process.env.NEXT_PUBLIC_SUPABASE_URL, nonce);
    request.headers.set('x-nonce', nonce);
    request.headers.set('Content-Security-Policy', forwarded.get('Content-Security-Policy')!);
  }
  const path = request.nextUrl.pathname;
  const api = path.startsWith('/api/');
  const machine = path.startsWith('/api/webhooks/') || path.startsWith('/api/cron/');
  const liveness = path === '/api/health' && request.method === 'GET' && !request.nextUrl.searchParams.has('deep');
  function respond(response: NextResponse) {
    securityHeaders(response.headers, development, process.env.NEXT_PUBLIC_SUPABASE_URL, nonce);
    if (api || path === '/login' || path === '/signup' || path.startsWith('/auth/') || path.startsWith('/admin') || path.startsWith('/orders') || path.startsWith('/settings') || path.startsWith('/dev/')) response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (path.startsWith('/admin/') && !/^\/admin\/(?:purchases(?:\/[0-9a-f-]+)?|support|settings|env-health)\/?$/i.test(path)) {
    return respond(NextResponse.redirect(new URL('/admin/purchases', request.url)));
  }
  if (path === '/dev/preview') {
    if (!devPreviewAllowed(process.env.NODE_ENV, process.env.PAYNSHIP_DEV_PREVIEW, request.headers.get('host'))) {
      return respond(new NextResponse('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    }
    const forwarded = new Headers(request.headers);
    forwarded.set('x-paynship-dev-preview', '1');
    return respond(NextResponse.next({ request: { headers: forwarded } }));
  }
  if (path === '/dev-login' || path.startsWith('/dev/') || path.startsWith('/p/')) {
    return respond(NextResponse.redirect(new URL('/', request.url)));
  }
  if (api) {
    if (!isActiveApiPath(path)) return respond(NextResponse.json({ error: 'This API has been retired. Use the purchase request flow.' }, { status: 410 }));
    const length = Number(request.headers.get('content-length') ?? '0');
    if (!Number.isFinite(length) || length < 0 || length > (machine ? 262144 : 8192)) return respond(NextResponse.json({ error: 'Request body is too large.' }, { status: 413 }));
    if (!machine && !isTrustedMutation(request, process.env.NEXT_PUBLIC_APP_URL, development)) return respond(NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 }));
    if (!machine && !liveness) {
      if (!limiter && !development) return respond(NextResponse.json({ error: 'Request protection is not configured.' }, { status: 503 }));
      if (limiter) {
        try {
          // Deploy only behind a proxy that replaces client-supplied forwarding headers.
          const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
          const { success, reset } = await limiter.limit(ip);
          if (!success) return respond(NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))) } }));
        } catch { return respond(NextResponse.json({ error: 'Request protection is temporarily unavailable.' }, { status: 503 })); }
      }
    }
  }
  // Route handlers verify their own user and can refresh response cookies.
  // Browser SSR needs the session refresh here; avoid two Auth lookups per API.
  // Supabase calls this bearer-token adapter before a browser session exists.
  // Its handler independently validates the token and applies shared quotas.
  if (api || machine || liveness || path === '/auth/naver/userinfo') return respond(NextResponse.next());
  return respond(await updateSession(request));
}

export const config = { runtime: 'nodejs', matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
