import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import AccountPanel from '@/components/site/AccountPanel';
import PreviewModeLink from '@/components/site/PreviewModeLink';
import { headers } from 'next/headers';
import { devPreviewAllowed } from '@/lib/dev-preview/access';

export const metadata: Metadata = { title: 'Sign in · PayNShip', description: 'Sign in to save delivery details and follow your Korean purchase requests.' };

export default async function LoginPage() {
  const requestHeaders = await headers();
  const preview = devPreviewAllowed(process.env.NODE_ENV, process.env.PAYNSHIP_DEV_PREVIEW, requestHeaders.get('host'));
  return <SiteShell variant="coastal"><AccountPanel mode="login">{preview && <><p>Developing locally? Explore the customer screens with fictional data.</p><PreviewModeLink mode="enter" className="text-button" /></>}</AccountPanel></SiteShell>;
}
