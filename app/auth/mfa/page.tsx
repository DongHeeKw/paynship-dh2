import { redirect } from 'next/navigation';
import SiteShell from '@/components/site/SiteShell';
import AdminMfaForm from '@/components/auth/AdminMfaForm';
import { getAdminMfaEnrollmentAccess } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';
export default async function AdminMfaPage() {
  const { user, isAdmin } = await getAdminMfaEnrollmentAccess();
  if (!user) redirect('/login?next=/auth/mfa');
  if (!isAdmin) redirect('/');
  return <SiteShell><div className="page-content"><div className="page-heading"><h1>Verify your operations account</h1><p>Use an authenticator app before accessing customer information or operations.</p></div><AdminMfaForm /></div></SiteShell>;
}
