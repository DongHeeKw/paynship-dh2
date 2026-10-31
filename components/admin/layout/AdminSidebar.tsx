'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const LINKS = [['/admin/purchases', 'Requests'], ['/admin/support', 'Support'], ['/admin/settings', 'Settings']] as const;
export default function AdminSidebar() {
  const pathname = usePathname();
  return <nav className="admin-navigation" aria-label="Operations navigation"><span className="font-semibold">Operations</span>{LINKS.map(([href, label]) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? 'page' : undefined} className={pathname.startsWith(href) ? 'font-semibold' : 'muted'}>{label}</Link>)}</nav>;
}
