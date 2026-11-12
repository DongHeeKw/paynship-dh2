'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { customerAccountHref, customerReturnPath } from '@/lib/auth/customer-redirect';
import { CUSTOMER_EMAIL_MAX, CUSTOMER_PASSWORD_MAX, CUSTOMER_PASSWORD_MIN, customerAuthOriginError, signInWithEmail, signUpWithEmail } from '@/lib/auth/customer-auth';

function GoogleMark() {
  return <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.01v2.51h3.23c1.9-1.75 2.99-4.33 2.99-7.34Z" /><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.23-2.51c-.9.6-2.03.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.07v2.59A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.51H3.07a10 10 0 0 0 0 8.98l3.33-2.59Z" /><path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.88-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.51L6.4 10.1A5.99 5.99 0 0 1 12 5.98Z" /></svg>;
}

function EyeMark({ visible }: { visible: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg>;
}

function nextStepDescription(next: string): string {
  const pathname = next.split(/[?#]/, 1)[0];
  if (pathname === '/settings/delivery') return 'Next: add the recipient and address for your delivery.';
  if (pathname === '/purchase') return 'Next: finish your product details and send a request for review.';
  if (pathname === '/orders') return 'Next: see your purchase requests and their latest updates.';
  if (pathname.startsWith('/orders/')) return 'Next: return to your request and its details.';
  return 'After signing in, you’ll return to where you left off.';
}

export default function SignInForm({ mode = 'login' }: { mode?: 'login' | 'signup' }) {
  const signup = mode === 'signup';
  const { user, loading, signIn } = useAuth();
  const params = useSearchParams();
  const next = customerReturnPath(params.get('next'));
  const callbackFailed = params.get('error') === 'callback';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [checkInbox, setCheckInbox] = useState(false);
  const [ipPreview, setIpPreview] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const disabled = Boolean(busy) || ipPreview;

  useEffect(() => { setIpPreview(Boolean(customerAuthOriginError())); }, []);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || ipPreview) return;
    setError('');
    if (signup && password !== confirmation) { showError('Your passwords don’t match. Please try again.'); return; }
    pending.current = true;
    setBusy('email');
    try {
      const credentials = { email, password };
      const result = signup ? await signUpWithEmail(credentials, next) : await signInWithEmail(credentials);
      if (result.status === 'authenticated') {
        setPassword(''); setConfirmation('');
        window.location.assign(next);
        return;
      }
      if (result.status === 'confirmation') { setCheckInbox(true); setPassword(''); setConfirmation(''); }
      else showError(result.message);
    } catch {
      showError('We couldn’t connect. Please try again shortly.');
    }
    pending.current = false;
    setBusy(null);
  }

  async function startGoogle() {
    if (pending.current || ipPreview) return;
    const originError = customerAuthOriginError();
    if (originError) { showError(originError); return; }
    pending.current = true;
    setBusy('google'); setError('');
    try { await signIn(next); }
    catch (err) { showError(err instanceof Error ? err.message : 'Could not start Google sign-in. Please try again shortly.'); pending.current = false; setBusy(null); }
  }

  if (loading) return <div className="account-state" role="status"><span className="account-state-icon" aria-hidden="true">↗</span><h2>One little moment.</h2><p>Checking your account…</p></div>;
  if (user) return <div className="account-state"><span className="account-state-icon" aria-hidden="true">✓</span><h2>You’re all signed in.</h2><p>{nextStepDescription(next)}</p><Link href={next} className="account-primary">Continue <span aria-hidden="true">↗</span></Link></div>;
  if (checkInbox) return <div className="account-state" role="status"><span className="account-state-icon" aria-hidden="true"><svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg></span><h2>Check your inbox.</h2><p>If this address can be registered, you’ll receive an email to confirm it. Open the link in the browser where you signed up, then return to this tab to keep your product draft.</p><p>Already have an account? You can sign in below.</p><Link href={customerAccountHref('login', next)} className="account-primary">Back to sign in <span aria-hidden="true">↗</span></Link><p className="account-small">Your saved product link stays in this tab.</p></div>;

  return <div className="account-form-content" data-ip-preview={ipPreview || undefined}>
    <nav className="account-mode-switch" aria-label="Account access">
      <Link href={customerAccountHref('login', next)} aria-current={!signup ? 'page' : undefined}>Sign in</Link>
      <Link href={customerAccountHref('signup', next)} aria-current={signup ? 'page' : undefined}>Create account</Link>
    </nav>
    <div className="account-form-heading"><span className="account-card-kicker">{signup ? 'YOUR JOURNEY STARTS HERE' : 'GOOD TO SEE YOU'}</span><h2>{signup ? 'Create your account.' : 'Welcome back.'}</h2><p>{signup ? 'Use your email. No social account needed.' : 'Sign in with your email and password.'}</p></div>
    {ipPreview && <p className="account-preview-notice" role="status">You’re viewing the IP preview. Sign in and account creation open when our secure HTTPS site is ready.</p>}
    {callbackFailed && !error && <p className="account-message" role="alert">That sign-in link couldn’t be completed. It may have expired or opened in a different browser. Please sign in again.</p>}
    <form className="account-form" onSubmit={event => void submit(event)} aria-busy={busy === 'email'}>
      <div className="account-field"><label htmlFor="account-email">Email address</label><input id="account-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={CUSTOMER_EMAIL_MAX} value={email} onChange={event => setEmail(event.target.value)} required disabled={disabled} /></div>
      <div className="account-field"><label htmlFor="account-password">Password</label><div className="account-password"><input id="account-password" name="password" type={visible ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? `At least ${CUSTOMER_PASSWORD_MIN} characters` : 'Your password'} minLength={signup ? CUSTOMER_PASSWORD_MIN : 1} maxLength={CUSTOMER_PASSWORD_MAX} value={password} onChange={event => setPassword(event.target.value)} aria-describedby={signup ? 'account-password-hint' : undefined} required disabled={disabled} /><button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} disabled={disabled}><EyeMark visible={visible} /></button></div>{signup && <small id="account-password-hint">Use {CUSTOMER_PASSWORD_MIN}–{CUSTOMER_PASSWORD_MAX} characters. Choose a password you don’t use elsewhere.</small>}</div>
      {signup && <div className="account-field"><label htmlFor="account-password-confirm">Confirm password</label><input id="account-password-confirm" name="password-confirmation" type={visible ? 'text' : 'password'} autoComplete="new-password" placeholder="Once more, just to be sure" minLength={CUSTOMER_PASSWORD_MIN} maxLength={CUSTOMER_PASSWORD_MAX} value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={disabled} /></div>}
      {error && <p className="account-message" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
      <button type="submit" className="account-primary" disabled={disabled}>{busy === 'email' ? (signup ? 'Creating your account…' : 'Signing you in…') : (signup ? 'Create account with email' : 'Sign in with email')}<span aria-hidden="true">↗</span></button>
    </form>
    <div className="account-divider"><span>or continue with</span></div>
    <button type="button" className="account-google" onClick={() => void startGoogle()} disabled={disabled}><GoogleMark />{busy === 'google' ? 'Opening Google…' : 'Continue with Google'}</button>
    <p className="account-next-step"><span aria-hidden="true">↳</span>{nextStepDescription(next)}</p>
    <p className="account-switch">{signup ? 'Already part of the journey?' : 'New to PayNShip?'} <Link href={customerAccountHref(signup ? 'login' : 'signup', next)}>{signup ? 'Sign in' : 'Create an account'}</Link></p>
    <p className="account-small">{signup ? 'Confirm your email to save delivery details and send a request. Creating an account does not place an order.' : 'Your product draft stays in the tab where you started.'}</p>
  </div>;
}
