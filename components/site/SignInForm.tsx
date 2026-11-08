'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
export default function SignInForm() {
  const { user, loading, signIn } = useAuth();
  const params = useSearchParams();
  const candidate = params.get('next') || '/orders';
  const next = candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\') ? candidate : '/orders';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const callbackFailed = params.get('error') === 'callback';
  async function start() {
    setBusy(true);
    setError('');
    try {
      await signIn(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Google sign-in. Check the Supabase Google provider setup and try again.');
      setBusy(false);
    }
  }
  if (loading) return <p role="status" className="muted">Checking your account…</p>;
  if (user) return <Link href={next} className="primary-button">Continue</Link>;
  return <div className="form-stack">
    <div><button className="primary-button" onClick={() => void start()} disabled={busy}>{busy ? 'Opening sign in…' : 'Continue with Google'}</button></div>
    {(error || callbackFailed) && <p role="alert" className="error-message">{error || 'Google sign-in did not complete. Check the Supabase provider and allowed redirect URL settings, then try again.'}</p>}
    <p className="muted">Your product link is kept for when you return.</p>
  </div>;
}
