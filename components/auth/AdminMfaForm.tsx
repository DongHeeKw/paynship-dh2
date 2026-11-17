'use client';
/* eslint-disable @next/next/no-img-element -- Keep private TOTP QR images out of optimization and image caches. */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Factor { id: string; friendly_name?: string; }
interface Enrollment { id: string; qrCode: string; secret: string; }

export default function AdminMfaForm() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await createClient().auth.mfa.listFactors();
        if (error || !data) throw new Error();
        if (active) { setFactors(data.totp); setFactorId(data.totp[0]?.id ?? ''); }
      } catch { if (active) setError('Could not load your authenticators. Try signing in again.'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function enroll() {
    setBusy(true); setError('');
    try {
      const { data, error } = await createClient().auth.mfa.enroll({ factorType: 'totp', friendlyName: `PayNShip ${new Date().toISOString()}` });
      if (error || !data) throw new Error();
      setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setFactorId(data.id); setCode('');
    } catch { setError('Could not add an authenticator. Check your authentication settings or sign in again.'); }
    finally { setBusy(false); }
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (!factorId || !/^\d{6}$/.test(code)) throw new Error();
      const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw new Error();
      setEnrollment(null); setCode('');
      // A full request makes the server verify the new session before operations.
      window.location.assign('/admin/purchases');
    } catch { setCode(''); setError('Verification failed. Enter a fresh six-digit code and try again.'); }
    finally { setBusy(false); }
  }

  async function cancelEnrollment() {
    if (!enrollment) return;
    setBusy(true); setError('');
    try {
      const { error } = await createClient().auth.mfa.unenroll({ factorId: enrollment.id });
      if (error) throw new Error();
      setEnrollment(null); setFactorId(factors[0]?.id ?? ''); setCode('');
    } catch { setError('Could not cancel setup. Try again.'); }
    finally { setBusy(false); }
  }

  if (loading) return <p role="status">Loading authenticators…</p>;
  return <div className="form-stack">
    {error && <p role="alert" className="error-message">{error}</p>}
    {enrollment ? <div className="notice">
      <p>Add this account to your authenticator app. Keep the setup key private.</p>
      {/* Supabase supplies the QR as an SVG; render as an image, never inline markup. */}
      <img src={enrollment.qrCode.startsWith('data:image/svg+xml') ? enrollment.qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qrCode)}`} alt="Scan to add your PayNShip authenticator" width={200} height={200} />
      <details><summary>Enter the setup key manually</summary><code>{enrollment.secret}</code></details>
      <button type="button" className="text-button" disabled={busy} onClick={() => void cancelEnrollment()}>Cancel setup</button>
    </div> : factors.length > 0 ? <label>Authenticator<select value={factorId} onChange={event => setFactorId(event.target.value)} disabled={busy}>
      {factors.map(factor => <option key={factor.id} value={factor.id}>{factor.friendly_name || 'Authenticator app'}</option>)}
    </select></label> : <div><button type="button" className="primary-button" disabled={busy} onClick={() => void enroll()}>Set up an authenticator</button></div>}
    {factorId && <form className="form-stack" onSubmit={event => void verify(event)}>
      <label>Six-digit code<input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} /></label>
      <div><button className="primary-button" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify and continue'}</button></div>
    </form>}
    <p className="muted">If you lose access to your authenticator, contact the account owner. Customer information remains locked until secure account recovery is completed.</p>
  </div>;
}
