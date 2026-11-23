import SiteShell from '@/components/site/SiteShell';
import AuthRequired from '@/components/site/AuthRequired';
import PurchaseList from '@/components/purchases/PurchaseList';
export default function OrdersPage() {
  return <SiteShell variant="coastal"><div className="requests-page"><div className="page-heading"><h1>Orders &amp; quotes<span>.</span></h1><p>Review quotes, see what needs your attention, and follow recorded purchase and shipping progress.</p></div><AuthRequired next="/orders" variant="requests"><PurchaseList /></AuthRequired></div></SiteShell>;
}
