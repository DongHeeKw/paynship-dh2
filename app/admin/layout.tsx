import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/helpers';
import SiteShell from '@/components/site/SiteShell';
import AdminSidebar from '@/components/admin/layout/AdminSidebar';
export const metadata = { title: 'Operations — PayNShip', description: 'Purchase review and customer support' };
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, error } = await requireAdmin();
  if (error || !isAdmin) redirect('/');
  return <SiteShell><AdminSidebar />{children}</SiteShell>;
}
