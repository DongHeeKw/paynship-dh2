'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import GuestJourney from './GuestJourney';
export default function AuthRequired({ children, next, variant }: { children: React.ReactNode; next: string; variant?: 'delivery' | 'requests' }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted" role="status">Checking your account…</p>;
  if (!user && variant) return <GuestJourney next={next} variant={variant} />;
  if (!user) return <div className="form-stack"><p>Sign in to access your requests and delivery details.</p><div className="action-row"><Link className="primary-button" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link><Link href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></div></div>;
  return <>{children}</>;
}
