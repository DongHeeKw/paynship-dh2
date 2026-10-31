'use client';

export function buildOAuthRedirectTo(nextPath?: string) {
  const currentPath = nextPath ?? `${window.location.pathname}${window.location.search}`;
  const redirectUrl = new URL('/auth/callback', window.location.origin);

  redirectUrl.searchParams.set('next', currentPath || '/');

  return redirectUrl.toString();
}
