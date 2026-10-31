import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { getSiteUrl } from '@/lib/site/url';
import { headers } from 'next/headers';
import { devPreviewAllowed } from '@/lib/dev-preview/access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { metadataBase: new URL(getSiteUrl()), title: 'PayNShip', description: 'Buy from Korean stores and follow your international delivery.', robots: 'noindex, nofollow' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const localPreview = requestHeaders.get('x-paynship-dev-preview') === '1' &&
    devPreviewAllowed(process.env.NODE_ENV, process.env.PAYNSHIP_DEV_PREVIEW, requestHeaders.get('host'));
  return <html lang="en"><body><AuthProvider localPreview={localPreview}>{children}</AuthProvider></body></html>;
}
