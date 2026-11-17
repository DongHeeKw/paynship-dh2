import SiteHeader from './SiteHeader';
export default function SiteShell({ children, variant = 'coastal' }: { children: React.ReactNode; variant?: 'home' | 'coastal' }) {
  return <div className={`site-shell site-shell-themed site-shell-${variant}`}><SiteHeader /><main className="site-main">{children}</main><footer className="site-footer"><span>PayNShip · Korea, delivered.</span><span>Purchase support & international shipping</span></footer></div>;
}
