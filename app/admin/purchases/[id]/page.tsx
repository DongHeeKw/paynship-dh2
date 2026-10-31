import AdminPurchaseDetail from '@/components/purchases/AdminPurchaseDetail';
export default async function AdminPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="page-content"><AdminPurchaseDetail id={id} /></div>;
}
