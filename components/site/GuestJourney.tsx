import Link from 'next/link';
import JourneyIllustration from '@/components/home/JourneyIllustration';
import { customerAccountHref } from '@/lib/auth/customer-redirect';
import './guest-journey.css';

function AccountActions({ next }: { next: string }) {
  return <div className="action-row">
    <Link className="primary-button" href={customerAccountHref('login', next)}>Sign in to continue <span aria-hidden="true">↗</span></Link>
    <Link className="secondary-button" href={customerAccountHref('signup', next)}>Create an account</Link>
  </div>;
}

export default function GuestJourney({ next, variant }: { next: string; variant: 'delivery' | 'requests' }) {
  const delivery = variant === 'delivery';
  return <div className="guest-journey">
    <section className="guest-intro" aria-labelledby="guest-intro-title">
      <div>
        <p className="guest-kicker">{delivery ? 'A HOME FOR YOUR NEXT FIND' : 'YOUR FINDS, ALL IN ONE PLACE'}</p>
        <h2 id="guest-intro-title">{delivery ? <>Give your finds<br />a place to land.</> : <>Every little find.<br />Every next step.</>}</h2>
        <p>{delivery
          ? 'Delivery details are your saved recipient, address and destination information. Add them once after signing in, then use them for your next purchase request.'
          : 'A request asks PayNShip to buy a product in Korea and arrange international shipping. Sign in to see your submitted requests, quotes and progress here.'}</p>
        <AccountActions next={next} />
        <p className="guest-intro-note">Still exploring? <Link href="/purchase">Start a product draft without an account <span aria-hidden="true">→</span></Link></p>
      </div>
      <JourneyIllustration step={delivery ? 'delivery' : 'link'} />
    </section>

    {delivery ? <section className="guest-preview" aria-labelledby="delivery-preview-title">
      <div className="guest-preview-heading"><div><p className="guest-kicker">A LOOK INSIDE</p><h2 id="delivery-preview-title">What you’ll add after signing in</h2></div><span className="guest-example-tag">Field preview · nothing saved</span></div>
      <div className="guest-delivery-fields">
        <article><span className="guest-step-number">01</span><h3>Who receives it</h3><p>Recipient name and contact number, so the shipment can reach the right person.</p><div className="guest-field-preview">Recipient name <span aria-hidden="true">↗</span></div><div className="guest-field-preview">Phone number <span aria-hidden="true">↗</span></div></article>
        <article><span className="guest-step-number">02</span><h3>Where it’s going</h3><p>Country, street address, city and the postal details your destination uses.</p><div className="guest-field-preview">Country & address <span aria-hidden="true">↗</span></div><div className="guest-field-preview">City & postal code <span aria-hidden="true">↗</span></div></article>
        <article><span className="guest-step-number">03</span><h3>What to prepare</h3><p>Destination-specific guidance explains any recipient or customs review needed.</p><div className="guest-guidance-note">We review the product and shipping route before a quote. Saving an address does not approve delivery.</div></article>
      </div>
      <p className="guest-preview-footnote">Your saved address is private. Changing it later does not change the delivery details already attached to a submitted request.</p>
    </section> : <section className="guest-preview" aria-labelledby="request-preview-title">
      <div className="guest-preview-heading"><div><p className="guest-kicker">A LOOK INSIDE</p><h2 id="request-preview-title">From product link to progress</h2></div><span className="guest-example-tag">Illustration · not a real request</span></div>
      <div className="guest-request-preview">
        <div className="guest-request-card">
          <div className="guest-request-card-top"><span className="guest-package-icon" aria-hidden="true">↗</span><span>YOUR PRODUCT GOES HERE</span></div>
          <h3>Your next Korean find</h3>
          <p>A product link, the options you choose, and your destination.</p>
          <dl><div><dt>Product</dt><dd>Your chosen seller link</dd></div><div><dt>Quote</dt><dd>Available after review</dd></div><div><dt>Shipping</dt><dd>Updates when available</dd></div></dl>
          <p className="guest-request-card-note">No request has been submitted in this example.</p>
        </div>
        <ol className="guest-request-stages" aria-label="How a purchase request works">
          <li><span className="guest-step-number">01</span><div><h3>Send a request</h3><p>Sign in, save your delivery details and submit your product for review. No payment yet.</p></div></li>
          <li><span className="guest-step-number">02</span><div><h3>Review your quote</h3><p>We check the product, destination requirements and shipping route. Pay only if you choose to accept an available quote.</p></div></li>
          <li><span className="guest-step-number">03</span><div><h3>Follow what happens next</h3><p>See purchasing, warehouse and shipping updates as they are recorded. Ask a question on the same request.</p></div></li>
        </ol>
      </div>
      <p className="guest-preview-footnote">These steps explain the service. They are not live payment, shipping or customs updates. <Link href="/demo">Explore sample database data.</Link></p>
      <div className="guest-demo-link"><div><strong>Want to explore more?</strong><p>See fictional products, customers and shipment examples on our sample-data page.</p></div><Link className="secondary-button" href="/demo">Explore sample data <span aria-hidden="true">↗</span></Link></div>
    </section>}

    <section className="guest-access" aria-labelledby="guest-access-title">
      <div><p className="guest-kicker">START SMALL. SIGN IN WHEN YOU’RE READY.</p><h2 id="guest-access-title">What can I do as a guest?</h2></div>
      <div><h3>Before signing in</h3><p>Explore the service, enter a product link and choose options and a destination. Your product draft stays in this browser tab for up to 24 hours.</p></div>
      <div><h3>With a verified account</h3><p>Save your delivery details, submit requests and privately access your quotes, progress and support messages.</p></div>
    </section>
  </div>;
}
