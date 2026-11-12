'use client';

import { useState } from 'react';
import Link from 'next/link';
import UrlIntake from '@/components/purchases/UrlIntake';
import ParcelWorld from './ParcelWorld';
import JourneyIllustration from './JourneyIllustration';

function parcelLabel(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return 'YOUR NEXT FIND';
    return url.hostname.replace(/^www\./, '').slice(0, 32);
  } catch {
    return 'YOUR NEXT FIND';
  }
}

const steps = [
  { step: 'link', title: 'You find it.', description: 'Send the product link, plus the options and quantity you have in mind.', note: 'A little link goes a long way.' },
  { step: 'quote', title: 'We check it.', description: 'We review the product and destination. You review the quote before you pay.', note: 'The details come first.' },
  { step: 'delivery', title: 'Follow its journey.', description: 'Keep up with purchase, warehouse, and shipping updates in one place.', note: 'From there to right here.' },
] as const;

export default function HomeExperience() {
  const [focused, setFocused] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [packed, setPacked] = useState(false);

  return <div className="parcel-home">
    <section className="parcel-hero" aria-labelledby="home-heading">
      <div className="parcel-hero-copy">
        <h1 id="home-heading">From Korea<br /><span>to your door<svg className="parcel-heading-swoosh" viewBox="0 0 360 15" fill="none" aria-hidden="true"><path d="M4 10Q169-4 356 7" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></svg>.</span></h1>
        <p className="parcel-description">You find it. We help buy it and ship it.<br className="parcel-desktop-break" /> Your favorite Korean stores, a little closer.</p>
        <div className="parcel-intake">
          <p className="parcel-input-label"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 13 4-4m-7 6-2 2a4 4 0 0 0 6 6l4-4a4 4 0 0 0 0-6m2-4 2-2a4 4 0 0 0-6-6L9 5a4 4 0 0 0 0 6" transform="translate(1 -1) scale(.9)" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>Every journey starts with a link.</p>
          <UrlIntake onFocusChange={setFocused} onUrlChange={value => { setProductUrl(value); setPacked(false); }} onContinue={() => setPacked(true)} />
          <p className="parcel-intake-note">Try a link without an account. Nothing is purchased at this step.</p>
        </div>
        <div className="parcel-home-links"><a href="#how-it-works">How it works <span aria-hidden="true">↓</span></a><Link href="/orders">See an example request <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className="parcel-hero-art">
        <ParcelWorld focused={focused} packed={packed} label={parcelLabel(productUrl)} />
      </div>
    </section>

    <div className="parcel-service-strip"><strong>From your first find to the next step.</strong><span>Explore before signing in</span><span>Review your quote before paying</span><span>Follow your request in one place</span></div>

    <section className="parcel-journey" id="how-it-works" aria-labelledby="journey-heading">
      <div className="parcel-journey-heading"><div><p className="parcel-section-label">A SMALL LINK. A WHOLE JOURNEY.</p><h2 id="journey-heading">Good finds deserve to travel.</h2></div><p>You do the finding.<br />{' '}We help with what comes next.</p></div>
      <ol className="parcel-steps">
        {steps.map(({ step, title, description, note }, index) => <li className={`parcel-step parcel-step-${step}`} key={step}>
          <div className="parcel-step-art"><span className="parcel-step-number">0{index + 1}</span><JourneyIllustration step={step} /><span className="parcel-route-arrow" aria-hidden="true">↗</span></div>
          <h3>{title}</h3><p>{description}</p><span className="parcel-step-note">{note}</span>
        </li>)}
      </ol>
    </section>

    <aside className="parcel-review-note"><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m14 3 9 4v7c0 5-9 11-9 11S5 19 5 14V7l9-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m10 13 3 3 5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg><p><strong>A little care at every step.</strong> Products and destinations are reviewed before a quote. A link is just the beginning.</p><a href="#product-url">Start with your find <span aria-hidden="true">↗</span></a></aside>

    <section className="parcel-faq" aria-labelledby="questions-heading">
      <div><p className="parcel-section-label">BEFORE YOUR FIRST FIND</p><h2 id="questions-heading">A few things,<br />unpacked.</h2><p className="parcel-faq-intro">Start by exploring. Create an account when you’re ready for us to review your request.</p></div>
      <div>
        <details open><summary>What is a purchase request?</summary><p>It’s your request for us to buy a specific product: its link, options, quantity, and destination. We review it before preparing a quote. Submitting a request doesn’t place a purchase or charge you.</p></details>
        <details><summary>What are delivery details?</summary><p>Your recipient name, address, contact information, and any destination-specific customs details. Save them securely after signing in. They tell us where a parcel should go; shipment progress appears inside your request. <Link href="/settings/delivery">Explore delivery details.</Link></p></details>
        <details><summary>What can I do without an account?</summary><p>Prepare a product draft, explore the service, and view the example request. Sign in to save your delivery details, submit requests, and see your own quotes and updates.</p></details>
        <details><summary>Can every Korean product be shipped?</summary><p>Each product and destination needs review. The country list helps you prepare a request; we still need to check the actual shipping route. A valid link or selected country does not confirm shipping or customs eligibility.</p></details>
      </div>
    </section>
  </div>;
}
