import { redirect } from 'next/navigation';

export default function ProductDashboardRedirect() {
  redirect('/admin/purchases');
}
