import Link from 'next/link';
import JourneyIllustration from '@/components/home/JourneyIllustration';
import './service-guide.css';

const steps = [
  { step: 'link', title: 'Choose your find.', description: 'Paste your own link or select a product in Discover Korea. Confirm the exact options, quantity and destination.', note: 'A little link goes a long way.' },
  { step: 'quote', title: 'We check it.', description: 'We review the product and destination. You review the quote before you pay.', note: 'The details come first.' },
  { step: 'delivery', title: 'Follow its journey.', description: 'Keep up with purchase, warehouse, and shipping updates in one place.', note: 'From there to right here.' },
] as const;

export default function HowItWorksGuide() {
  return <article className="service-guide-page">
    <header className="page-heading"><p className="parcel-section-label">YOUR PAYNSHIP GUIDE · UPDATED 2026-11-24</p><h1>How It Works</h1>
      <p>From choosing your find to delivery and returns. All the details, in one place.</p></header>
    <nav className="service-guide-topics" aria-label="Guide topics">
      <a href="#buying">Buying</a><a href="#costs">Costs</a><a href="#shipping-and-returns">Shipping</a><a href="#returns">Returns</a><a href="#questions">Common questions</a>
    </nav>
    <section className="parcel-journey" id="buying" aria-labelledby="journey-heading">
      <div className="parcel-journey-heading"><div><p className="parcel-section-label">A SMALL LINK. A WHOLE JOURNEY.</p><h2 id="journey-heading">Good finds deserve to travel.</h2></div><p>You do the finding.<br />{' '}We help with what comes next.</p></div>
      <ol className="parcel-steps">
        {steps.map(({ step, title, description, note }, index) => <li className={`parcel-step parcel-step-${step}`} key={step}>
          <div className="parcel-step-art"><span className="parcel-step-number">0{index + 1}</span><JourneyIllustration step={step} /><span className="parcel-route-arrow" aria-hidden="true">↗</span></div>
          <h3>{title}</h3><p>{description}</p><span className="parcel-step-note">{note}</span>
        </li>)}
      </ol>
    </section>
    <div className="service-guide-details">
    <section><h2>Products and authenticity</h2><p>Catalog cards are seller references. They do not confirm current stock, authenticity, exact options or eligibility for your destination. These details need evidence before an approved quote.</p></section>
    <section id="costs"><h2>Your costs before payment</h2><p>The service fee is 15% of merchandise value, with no minimum. International shipping, import charges and other applicable costs are separate. Missing costs are under review, not free.</p><p>Check the quote’s included charges and who pays import costs. “Duties included” requires a verified route; choosing a country alone does not establish it.</p></section>
    <section id="shipping-and-returns"><h2>Shipping and combined parcels</h2><p>Preparation depends on the actual product, inspection and shipping route. We do not promise a delivery date before there is reliable information.</p><p>Combined shipping is not currently available to book. Any future offer must show the costs and additional waiting time for your review before you agree.</p></section>
    <section id="returns"><h2>Cancellation, returns and damaged goods</h2><p>Before payment, eligible requests provide a cancellation action in their details. After payment or purchase, use the support section on your order to ask for review, including damage, incorrect goods or a return.</p><p>Refunds after payment cannot be processed automatically yet, and a complete returns policy is not available. No refund amount, free return, processing time or carrier claim outcome is promised here. Review the terms supplied for your order before paying.</p></section>
    <section><h2>Your order and private details</h2><p>Sign in to view your own quotes, recorded progress and support messages. Your saved delivery details are private; the Korean receiving hub’s address is not a customer selection.</p><Link href="/orders">Open orders &amp; quotes</Link></section>
    </div>
    <section className="parcel-faq" id="questions" aria-labelledby="questions-heading">
      <div><p className="parcel-section-label">BEFORE YOUR FIRST FIND</p><h2 id="questions-heading">A few things,<br />unpacked.</h2><p className="parcel-faq-intro">Start by exploring. Create an account when you’re ready for us to review your request.</p></div>
      <div>
        <details open><summary>What is a purchase request?</summary><p>It’s your request for us to buy a specific product: its link, options, quantity, and destination. We review it before preparing a quote. Submitting a request doesn’t place a purchase or charge you.</p></details>
        <details><summary>What are delivery details?</summary><p>Your recipient name, address, contact information, and any destination-specific customs details. Save them securely after signing in. They tell us where a parcel should go; shipment progress appears inside your request. <Link href="/settings/delivery">Explore delivery details.</Link></p></details>
        <details><summary>What can I do without an account?</summary><p>Prepare a product draft, explore the service, and browse Korean finds. Sign in to save your delivery details, submit requests, and see your own quotes and updates.</p></details>
        <details><summary>How much does PayNShip charge?</summary><p>Our service fee is 15% of the product subtotal, with no minimum. Shipping and import charges are separate. You can calculate the product-and-service subtotal before signing in; we verify the full quote before payment. <Link href="/purchase">Check your costs.</Link></p></details>
        <details><summary>Can every Korean product be shipped?</summary><p>Each product and destination needs review. The country list helps you prepare a request; we still need to check the actual shipping route. A valid link or selected country does not confirm shipping or customs eligibility.</p></details>
      </div>
    </section>
    <p className="service-guide-actions"><Link href="/">Paste a Link</Link><Link href="/products">Discover Korea</Link></p>
  </article>;
}
