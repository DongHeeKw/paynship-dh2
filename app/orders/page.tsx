import SiteShell from '@/components/site/SiteShell';
import AuthRequired from '@/components/site/AuthRequired';
import PurchaseList from '@/components/purchases/PurchaseList';
export default function OrdersPage() {
  return <SiteShell variant="coastal"><div className="requests-page"><div className="page-heading"><h1>My requests<span>.</span></h1><p>Your submitted product requests, quotes and progress.</p></div><AuthRequired next="/orders" variant="requests"><PurchaseList /></AuthRequired></div></SiteShell>;
}
