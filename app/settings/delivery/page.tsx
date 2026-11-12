import SiteShell from '@/components/site/SiteShell';
import AuthRequired from '@/components/site/AuthRequired';
import DeliveryForm from '@/components/purchases/DeliveryForm';
import { Suspense } from 'react';
import '@/components/purchases/delivery-details.css';
export default function DeliveryPage() {
  return <SiteShell variant="coastal"><div className="delivery-page"><div className="delivery-page-heading"><div><p className="delivery-kicker">THE NEXT STOP IS YOURS</p><h1>Delivery details<span>.</span></h1><p>Your saved recipient, address and destination information.</p></div><span className="delivery-heading-tag"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 4v6c0 4-8 9-8 9s-8-5-8-9V7l8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m8 12 3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Your account, your details</span></div><AuthRequired next="/settings/delivery" variant="delivery"><Suspense fallback={<p role="status">Loading…</p>}><DeliveryForm /></Suspense></AuthRequired></div></SiteShell>;
}
