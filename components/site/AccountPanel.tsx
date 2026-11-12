import { Suspense } from 'react';
import Link from 'next/link';
import JourneyIllustration from '@/components/home/JourneyIllustration';
import SignInForm from './SignInForm';
import './account.css';

export default function AccountPanel({ mode, children }: { mode: 'login' | 'signup'; children?: React.ReactNode }) {
  const signup = mode === 'signup';
  return <div className="account-page">
    <Link href="/" className="account-back"><span aria-hidden="true">←</span> Back to PayNShip</Link>
    <div className="account-layout">
      <section className="account-story" aria-labelledby="account-heading">
        <p className="account-eyebrow"><span aria-hidden="true" />YOUR PAYNSHIP ACCOUNT</p>
        <h1 id="account-heading">Good finds.<br /><span>One little account.</span></h1>
        <p className="account-story-description">{signup ? 'Found something in Korea? Make a place for your purchase requests, delivery details, and the next steps.' : 'Come back to your purchase requests, saved delivery details, and updates from our team.'}</p>
        <div className="account-postcard" aria-hidden="true"><span className="account-postcard-tag">KOREA → YOUR DOOR</span><svg className="account-route" viewBox="0 0 280 130" fill="none"><path d="M20 100C-10 16 92 3 74 54s117 76 155-13" stroke="#2467ed" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" /><circle cx="22" cy="99" r="5" fill="#fa765f" stroke="#192c43" strokeWidth="1.5" /><path d="m222 47 8-9 3 12" stroke="#2467ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg><JourneyIllustration step="delivery" /><span className="account-postcard-note">A little closer to home.</span></div>
        <ul className="account-perks">
          <li><span aria-hidden="true">01</span><div><strong>A request for your find</strong><p>Ask us to review a product before you pay.</p></div></li>
          <li><span aria-hidden="true">02</span><div><strong>A place to send it</strong><p>Save your recipient and delivery address privately.</p></div></li>
          <li><span aria-hidden="true">03</span><div><strong>Your next step, in one place</strong><p>See review updates, available quotes, and shipment details.</p></div></li>
        </ul>
        <p className="account-guest-note">Just looking around? <Link href="/">Check a product link without an account <span aria-hidden="true">↗</span></Link></p>
      </section>
      <section className="account-card" aria-label={signup ? 'Create your account' : 'Sign in to your account'}><Suspense fallback={<p role="status" className="account-small">Getting things ready…</p>}><SignInForm mode={mode} /></Suspense></section>
    </div>
    {children && <div className="account-preview">{children}</div>}
  </div>;
}
