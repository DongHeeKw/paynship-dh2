import { Suspense } from 'react';
import SiteShell from '@/components/site/SiteShell';
import SignInForm from '@/components/site/SignInForm';
import PreviewModeLink from '@/components/site/PreviewModeLink';
import { headers } from 'next/headers';
import { devPreviewAllowed } from '@/lib/dev-preview/access';
export default async function LoginPage() {
  const requestHeaders = await headers();
  const preview = devPreviewAllowed(process.env.NODE_ENV, process.env.PAYNSHIP_DEV_PREVIEW, requestHeaders.get('host'));
  return <SiteShell><div className="page-content"><div className="page-heading"><h1>Sign in</h1><p>Your requests and delivery details belong to your account.</p></div><Suspense fallback={<p role="status">Loading…</p>}><SignInForm /></Suspense>{preview && <div className="notice mt-8"><p>Developing locally? Explore the customer screens with fictional data.</p><PreviewModeLink mode="enter" className="text-button" /></div>}</div></SiteShell>;
}
