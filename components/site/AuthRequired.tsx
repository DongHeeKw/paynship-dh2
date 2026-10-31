'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
export default function AuthRequired({ children, next }: { children: React.ReactNode; next: string }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted" role="status">Checking your account…</p>;
  if (!user) return <div className="form-stack"><p>Sign in to access your requests and delivery details.</p><div><Link className="primary-button" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></div></div>;
  return <>{children}</>;
}
