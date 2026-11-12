import SiteHeader from './SiteHeader';
export default function SiteShell({ children, variant }: { children: React.ReactNode; variant?: 'home' | 'coastal' }) {
  return <div className={`site-shell${variant ? ` site-shell-themed site-shell-${variant}` : ''}`}><SiteHeader /><main className="site-main">{children}</main><footer className="site-footer"><span>PayNShip · Korea, delivered.</span><span>Purchase support & international shipping</span></footer></div>;
}
