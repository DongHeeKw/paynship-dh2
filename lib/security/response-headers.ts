export function securityHeaders(headers: Headers, development: boolean, supabaseUrl?: string, nonce?: string) {
  let connection = '';
  if (supabaseUrl) { try { const url = new URL(supabaseUrl); if (url.protocol === 'https:') connection = ` ${url.origin} wss://${url.host}`; } catch { /* ignore invalid config */ } }
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const scripts = development ? "'self' 'unsafe-inline' 'unsafe-eval'" : nonce ? `'self' 'nonce-${nonce}' 'strict-dynamic'` : "'self'";
  const styles = development ? "'self' 'unsafe-inline'" : nonce ? `'self' 'nonce-${nonce}'` : "'self'";
  headers.set('Content-Security-Policy', `default-src 'self'; script-src ${scripts}; style-src ${styles}; img-src 'self'; font-src 'self'; connect-src 'self'${connection}${development ? ' ws://localhost:3000 ws://127.0.0.1:3000' : ''}; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);
  if (!development) headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
