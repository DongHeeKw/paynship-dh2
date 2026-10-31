import SiteShell from '@/components/site/SiteShell';
import PurchaseForm from '@/components/purchases/PurchaseForm';
export default function PurchasePage() {
  return <SiteShell><div className="page-content"><div className="page-heading"><h1>Start with the product</h1><p>Explore product and destination information first. Sign in when you are ready to save your request.</p></div><PurchaseForm /></div></SiteShell>;
}
