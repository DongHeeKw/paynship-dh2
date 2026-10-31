import SiteShell from '@/components/site/SiteShell';
import AuthRequired from '@/components/site/AuthRequired';
import DeliveryForm from '@/components/purchases/DeliveryForm';
import { Suspense } from 'react';
export default function DeliveryPage() {
  return <SiteShell><div className="page-content"><div className="page-heading"><h1>Delivery details</h1><p>Save your recipient and address once. We use these details to review shipping and import requirements.</p></div><AuthRequired next="/settings/delivery"><Suspense fallback={<p role="status">Loading…</p>}><DeliveryForm /></Suspense></AuthRequired></div></SiteShell>;
}
