'use client';

import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DevLoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}>
      <DevLoginInner />
    </Suspense>
  );
}

function DevLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('admin@paynship.local');
  const [password, setPassword] = useState('admin1234!');
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Local dev: always allow
    if (process.env.NODE_ENV !== 'production') {
      setAllowed(true);
      return;
    }
    // Production: require matching query param against public env token
    const guard = process.env.NEXT_PUBLIC_DEV_LOGIN_GUARD;
    const token = searchParams.get('t');
    setAllowed(!!guard && token === guard);
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg('❌ ' + error.message);
        return;
      }
      setMsg(`✅ Logged in as ${data.user?.email}. Redirecting to /admin ...`);
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setMsg('❌ ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (allowed === null) return <div style={{ padding: 40 }}>Checking access…</div>;
  if (!allowed) {
    return (
      <div style={{ padding: 40 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Access Denied</h1>
        <p style={{ color: '#666', fontSize: 13 }}>
          Production access requires <code>?t=&lt;token&gt;</code> parameter matching
          <code> NEXT_PUBLIC_DEV_LOGIN_GUARD </code> environment variable.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>⚠️ Dev-Only Login</h1>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 13 }}>
        This page is only available in local development. Use for admin access without OAuth setup.
      </p>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ccc', borderRadius: 4 }}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginTop: 4, border: '1px solid #ccc', borderRadius: 4 }}
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 14px', background: '#111', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {msg && <p style={{ marginTop: 16, fontSize: 14 }}>{msg}</p>}
      <hr style={{ margin: '24px 0' }} />
      <div style={{ fontSize: 12, color: '#888' }}>
        Default admin: <code>admin@paynship.local / admin1234!</code>
      </div>
    </div>
  );
}
