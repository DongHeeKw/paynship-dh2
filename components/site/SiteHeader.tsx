'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ShipIcon from '@/components/icons/ShipIcon';
import PreviewModeLink from './PreviewModeLink';
import { usePurchaseClient } from '@/components/purchases/PurchaseClient';
export default function SiteHeader() {
  const { user, signOut } = useAuth();
  const { href, preview } = usePurchaseClient();
  const pathname = usePathname();
  const [error, setError] = useState('');
  return <><header className="site-header"><Link href={href('/')} className="site-brand" aria-label="PayNShip home"><ShipIcon />PayNShip</Link><nav className="site-nav" aria-label="Main navigation"><Link href={href('/purchase')} aria-current={pathname === '/purchase' ? 'page' : undefined}>New request</Link><Link href={href('/orders')} aria-current={pathname.startsWith('/orders') ? 'page' : undefined}>My requests</Link><Link href={href('/settings/delivery')} aria-current={pathname === '/settings/delivery' ? 'page' : undefined}>Delivery details</Link>{preview ? <PreviewModeLink mode="exit" className="site-nav-action" /> : user ? <button className="text-button site-nav-action" onClick={() => { setError(''); void signOut().catch(() => setError('Could not sign out. Please try again.')); }}>Sign out</button> : <><Link href="/login" aria-current={pathname === '/login' ? 'page' : undefined}>Sign in</Link><Link href="/signup" className="site-nav-action" aria-current={pathname === '/signup' ? 'page' : undefined}>Sign up <span aria-hidden="true">↗</span></Link></>}</nav></header>{error && <p className="site-main error-message" role="alert">{error}</p>}</>;
}
