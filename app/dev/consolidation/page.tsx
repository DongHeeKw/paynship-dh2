import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { devPreviewAllowed } from '@/lib/dev-preview/access';
import ConsolidationPreview from '@/components/consolidation/ConsolidationPreview';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'PayNShip · 배송 방법 UI 시안',
  description: 'White-and-orange customer and home-hub preview using synthetic sample data.',
  robots: { index: false, follow: false },
};

export default async function ConsolidationPreviewPage() {
  const requestHeaders = await headers();
  if (!devPreviewAllowed(process.env.NODE_ENV, process.env.PAYNSHIP_DEV_PREVIEW, requestHeaders.get('host'))) notFound();
  return <ConsolidationPreview />;
}
