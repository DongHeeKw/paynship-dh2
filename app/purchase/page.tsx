import SiteShell from '@/components/site/SiteShell';
import PurchaseForm from '@/components/purchases/PurchaseForm';
import Link from 'next/link';
import '@/components/purchases/purchase-start.css';
export default function PurchasePage() {
  return <SiteShell variant="coastal"><div className="purchase-start">
    <div className="purchase-start-heading"><p className="purchase-start-kicker">ONE GOOD FIND IS ALL IT TAKES</p><h1>Start with a link<span>.</span></h1><p>Found something in Korea? Tell us what you love. We’ll review your product and shipping options before you pay.</p></div>
    <div className="purchase-start-layout">
      <section className="purchase-start-form" aria-labelledby="product-draft-title"><div className="purchase-start-form-heading"><h2 id="product-draft-title">Your product draft</h2><span>No account needed to explore</span></div><PurchaseForm /></section>
      <aside className="purchase-start-guide" aria-labelledby="request-guide-title">
        <p className="purchase-start-kicker">HOW IT WORKS</p><h2 id="request-guide-title">You find it.<br />We review the details.</h2><p>A request tells us what you’d like us to buy. Submitting one sends your product for review.</p>
        <ol><li><span>01</span><div><h3>Make it yours</h3><p>Add a product link, options, quantity and destination.</p></div></li><li><span>02</span><div><h3>Sign in & send</h3><p>Save your delivery details, then submit your request.</p></div></li><li><span>03</span><div><h3>Decide after review</h3><p>Review the available quote before choosing to pay.</p></div></li></ol>
        <div className="purchase-start-note"><strong>Just looking? You’re welcome here.</strong><p>Explore a product draft without signing in. Nothing is purchased or charged at this step.</p></div>
        <Link className="purchase-start-preview-link" href="/orders">See what a request looks like <span aria-hidden="true">↗</span></Link>
        <Link className="purchase-start-preview-link" href="/settings/delivery">What are delivery details? <span aria-hidden="true">↗</span></Link>
      </aside>
    </div>
  </div></SiteShell>;
}
