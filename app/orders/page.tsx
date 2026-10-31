import SiteShell from '@/components/site/SiteShell';
import AuthRequired from '@/components/site/AuthRequired';
import PurchaseList from '@/components/purchases/PurchaseList';
export default function OrdersPage() {
  return <SiteShell><div className="page-content"><div className="page-heading"><h1>Your requests</h1><p>Follow each purchase from review to delivery.</p></div><AuthRequired next="/orders"><PurchaseList /></AuthRequired></div></SiteShell>;
}
