import { Suspense } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { devPreviewAllowed } from '@/lib/dev-preview/access';
import DevPreviewWorkspace from '@/components/purchases/DevPreviewWorkspace';

export const dynamic = 'force-dynamic';
export default async function DevPreviewPage() {
  const requestHeaders = await headers();
  if (!devPreviewAllowed(process.env.NODE_ENV, process.env.PAYNSHIP_DEV_PREVIEW, requestHeaders.get('host'))) notFound();
  return <Suspense fallback={<p role="status">Loading local preview…</p>}><DevPreviewWorkspace /></Suspense>;
}
