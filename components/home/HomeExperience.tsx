'use client';

import { useState } from 'react';
import type { IntakeDraft } from '@/lib/purchases/intake-draft';
import Link from 'next/link';
import UrlIntake from '@/components/purchases/UrlIntake';
import ParcelWorld from './ParcelWorld';
import OrdersOverview from './OrdersOverview';
import './commerce-home.css';

function parcelLabel(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password) return 'YOUR NEXT FIND';
    return url.hostname.replace(/^www\./, '').slice(0, 32);
  } catch {
    return 'YOUR NEXT FIND';
  }
}

export default function HomeExperience() {
  const [focused, setFocused] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [packed, setPacked] = useState(false);
  const [destination, setDestination] = useState<IntakeDraft['destination']>('');

  return <div className="parcel-home">
    <OrdersOverview />
    <section className="parcel-hero" aria-labelledby="home-heading">
      <div className="parcel-hero-copy">
        <h1 id="home-heading">From Korea<br /><span>to your door<svg className="parcel-heading-swoosh" viewBox="0 0 360 15" fill="none" aria-hidden="true"><path d="M4 10Q169-4 356 7" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /></svg>.</span></h1>
        <p className="parcel-description">You find it. We help buy it and ship it.<br className="parcel-desktop-break" /> Your favorite Korean stores, a little closer.</p>
        <div className="parcel-intake">
          <p className="parcel-input-label"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m10 13 4-4m-7 6-2 2a4 4 0 0 0 6 6l4-4a4 4 0 0 0 0-6m2-4 2-2a4 4 0 0 0-6-6L9 5a4 4 0 0 0 0 6" transform="translate(1 -1) scale(.9)" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>Every journey starts with a link.</p>
          <label className="home-destination">Ship to<select value={destination} onChange={event => setDestination(event.target.value as IntakeDraft['destination'])} aria-label="Shopping destination">
            <option value="">Choose your destination</option><option value="US">United States</option><option value="JP">Japan</option><option value="CN">China</option>
          </select></label>
          <UrlIntake destination={destination} onFocusChange={setFocused} onUrlChange={value => { setProductUrl(value); setPacked(false); }} onContinue={() => setPacked(true)} />
          <p className="parcel-intake-note">Try a link without an account. Nothing is purchased at this step.</p>
        </div>
        <div className="parcel-home-links"><Link href="/guides/how-it-works">How it works <span aria-hidden="true">↗</span></Link><Link href="/orders">Follow your orders <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className="parcel-hero-art">
        <ParcelWorld focused={focused} packed={packed} label={parcelLabel(productUrl)} />
      </div>
    </section>

    <div className="parcel-service-strip"><strong>From your first find to the next step.</strong><span>15% service fee · no minimum</span><span>Review your quote before paying</span><span>Follow your request in one place</span></div>

    <aside className="parcel-review-note"><svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m14 3 9 4v7c0 5-9 11-9 11S5 19 5 14V7l9-4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m10 13 3 3 5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg><p><strong>A little care at every step.</strong> Products and destinations are reviewed before a quote. A link is just the beginning.</p><a href="#product-url">Start with your find <span aria-hidden="true">↗</span></a></aside>

  </div>;
}
