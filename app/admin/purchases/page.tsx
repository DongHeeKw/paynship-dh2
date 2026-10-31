import PurchaseList from '@/components/purchases/PurchaseList';
export default function AdminPurchasesPage() {
  return <div className="page-content"><div className="page-heading"><h1>Purchase requests</h1><p>Review product evidence and import requirements, then manage fulfilment.</p></div><PurchaseList admin /></div>;
}
