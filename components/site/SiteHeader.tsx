'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ShipIcon from '@/components/icons/ShipIcon';
import PreviewModeLink from './PreviewModeLink';
import { usePurchaseClient } from '@/components/purchases/PurchaseClient';
export default function SiteHeader() {
  const { user, signOut } = useAuth();
  const { href, preview } = usePurchaseClient();
  const [error, setError] = useState('');
  return <><header className="site-header"><Link href={href('/')} className="site-brand"><ShipIcon />PayNShip</Link><nav className="site-nav" aria-label="Main navigation"><Link href={href('/orders')}>Requests</Link><Link href={href('/settings/delivery')}>Delivery details</Link>{preview ? <PreviewModeLink mode="exit" /> : user ? <button className="text-button" onClick={() => { setError(''); void signOut().catch(() => setError('Could not sign out. Please try again.')); }}>Sign out</button> : <Link href="/login">Sign in</Link>}</nav></header>{error && <p className="site-main error-message" role="alert">{error}</p>}</>;
}
