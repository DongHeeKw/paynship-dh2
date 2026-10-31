import SiteShell from '@/components/site/SiteShell';
import AuthRequired from '@/components/site/AuthRequired';
import PurchaseDetailView from '@/components/purchases/PurchaseDetailView';
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SiteShell><div className="page-content"><AuthRequired next={`/orders/${id}`}><PurchaseDetailView id={id} /></AuthRequired></div></SiteShell>;
}
