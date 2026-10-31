export function isTrustedMutation(request: Request, appUrl: string | undefined, development: boolean) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const allowed = new Set<string>();
  if (appUrl) { try { allowed.add(new URL(appUrl).origin); } catch { /* fail closed */ } }
  if (development) for (const origin of ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000']) allowed.add(origin);
  const origin = request.headers.get('origin');
  if (origin) return allowed.has(origin);
  const referer = request.headers.get('referer');
  if (referer) { try { return allowed.has(new URL(referer).origin); } catch { return false; } }
  return !request.headers.has('cookie');
}
