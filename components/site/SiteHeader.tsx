'use client';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ShipIcon from '@/components/icons/ShipIcon';
import PreviewModeLink from './PreviewModeLink';
import { usePurchaseClient } from '@/components/purchases/PurchaseClient';
import { useHomeOrders } from '@/components/home/HomeOrdersProvider';
export default function SiteHeader() {
  const { user, signOut } = useAuth();
  const { href, preview } = usePurchaseClient();
  const { data } = useHomeOrders();
  const pathname = usePathname();
  const [error, setError] = useState('');
  return <><header className="site-header">
    <Link href={preview ? '/' : href('/')} className="site-brand" aria-label="PayNShip home"><ShipIcon />PayNShip</Link>
    <nav className="site-nav" aria-label="Main navigation">
      <Link href={preview ? href('/purchase') : '/'} aria-current={pathname === '/' || pathname === '/purchase' ? 'page' : undefined}>Paste a Link</Link>
      <Link href={href('/products')} aria-current={pathname === '/products' ? 'page' : undefined}>Discover Korea</Link>
      <Link href="/guides/how-it-works" aria-current={pathname === '/guides/how-it-works' ? 'page' : undefined}>How It Works</Link>
      {(user || preview) && <Link href={href('/orders')} aria-current={pathname.startsWith('/orders') ? 'page' : undefined}>Orders{Boolean(data?.attentionCount) && <span className="order-count" aria-label={`${data!.attentionCount} needing attention`}>{data!.attentionCount}</span>}</Link>}
    </nav>
    <div className="site-account">{preview ? <PreviewModeLink mode="exit" /> : user ? <details><summary>Account</summary><div className="account-menu">
      <Link href={href('/settings/delivery')}>Delivery details</Link>
      <button className="text-button" onClick={() => { setError(''); void signOut().catch(() => setError('Could not sign out. Please try again.')); }}>Sign out</button>
    </div></details> : <><Link href="/login">Sign in</Link><Link href="/signup" className="site-nav-action">Sign up</Link></>}</div>
  </header>{error && <p className="site-main error-message" role="alert">{error}</p>}</>;
}
