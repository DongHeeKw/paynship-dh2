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
    <div>
      <button
        className="google-sign-in"
        onClick={() => void start()}
        disabled={busy}
        aria-label={busy ? 'Opening Google sign-in' : 'Continue with Google'}
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" className="google-sign-in-icon">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.88c-.58 2.96-2.27 5.48-4.79 7.18l7.73 6C44.33 37.85 46.98 31.7 46.98 24.55Z" />
          <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.2a23.95 23.95 0 0 0 0 21.58l7.98-6.2Z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z" />
        </svg>
        <span>{busy ? 'Opening Google sign-in…' : 'Continue with Google'}</span>
      </button>
    </div>
    {(error || callbackFailed) && <p role="alert" className="error-message">{error || 'Google sign-in did not complete. Check the Supabase provider and allowed redirect URL settings, then try again.'}</p>}
    <p className="muted">Your product link is kept for when you return.</p>
  </div>;
}
