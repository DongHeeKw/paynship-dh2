const RETURN_BASES = ['/', '/purchase', '/orders', '/settings/delivery', '/admin/purchases', '/admin/support'];
const LOCAL_ORIGIN = 'https://paynship.invalid';

/** Return only recognized app routes; never trust a redirect from a query string. */
export function customerReturnPath(value: string | null | undefined, fallback = '/orders'): string {
  if (!value || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|5c|7f)/i.test(value)) return fallback;
  try {
    const url = new URL(value, LOCAL_ORIGIN);
    const rawPath = value.split(/[?#]/, 1)[0];
    if (url.origin !== LOCAL_ORIGIN || url.pathname !== rawPath || /%2f/i.test(url.pathname)) return fallback;
    return RETURN_BASES.some(base => url.pathname === base || (base !== '/' && url.pathname.startsWith(`${base}/`))) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function customerAccountHref(mode: 'login' | 'signup', nextPath: string): string {
  return `/${mode}?next=${encodeURIComponent(customerReturnPath(nextPath))}`;
}
