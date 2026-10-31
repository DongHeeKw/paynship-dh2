export function previewHref(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('This navigation is unavailable in the local preview.');
  const url = new URL(path, 'http://preview.invalid');
  if (url.pathname === '/' || url.pathname === '/purchase') return '/dev/preview?view=purchase';
  if (url.pathname === '/orders') return '/dev/preview?view=orders';
  if (/^\/orders\/[0-9a-f-]{36}$/i.test(url.pathname)) return `/dev/preview?view=detail&id=${url.pathname.split('/')[2]}`;
  if (url.pathname === '/settings/delivery') return '/dev/preview?view=delivery' + (url.searchParams.get('next') === '/purchase' ? '&next=%2Fpurchase' : '');
  throw new Error('This navigation is unavailable in the local preview.');
}
