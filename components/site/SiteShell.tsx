import SiteHeader from './SiteHeader';
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader /><main className="site-main">{children}</main><footer className="site-footer"><span>PayNShip · Korea, delivered.</span><span>Purchase support & international shipping</span></footer></>;
}
