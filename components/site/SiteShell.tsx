import Link from 'next/link';
import SiteHeader from './SiteHeader';
import { HomeOrdersProvider } from '@/components/home/HomeOrdersProvider';
export default function SiteShell({ children, variant = 'coastal' }: { children: React.ReactNode; variant?: 'home' | 'coastal' }) {
  return <HomeOrdersProvider><div className={`site-shell site-shell-themed site-shell-${variant}`}><SiteHeader /><main className="site-main">{children}</main>
    <footer className="site-footer"><span>PayNShip · Korea, delivered.</span><nav aria-label="Service links"><Link href="/guides/how-it-works">How It Works</Link><Link href="/orders">Orders &amp; quotes</Link><Link href="/settings/delivery">Delivery details</Link></nav></footer>
  </div></HomeOrdersProvider>;
}
