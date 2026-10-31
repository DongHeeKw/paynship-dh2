export function getSiteUrl() {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return process.env.NEXT_PUBLIC_APP_URL || 'https://paynship.io';
}
