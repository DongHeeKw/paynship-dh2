import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import UrlIntake from '@/components/purchases/UrlIntake';

export const metadata: Metadata = { title: 'PayNShip — From Korea to your door', description: 'Submit a Korean product link, review your quote, and follow your delivery.' };

export default function Home() {
  return <SiteShell>
    <section className="home-intake">
      <p className="eyebrow">KOREAN STORES. YOUR ADDRESS.</p>
      <h1>From Korea<br />to your door.</h1>
      <p className="home-description">Found something you want? Start with the product link.</p>
      <UrlIntake />
      <p className="home-note">Sign in to save your delivery details and follow your request.</p>
    </section>
    <ol className="process-list" aria-label="How it works">
      <li><span>01</span><h2>Send a link</h2><p>Tell us which product, option, and quantity you want.</p></li>
      <li><span>02</span><h2>Review your quote</h2><p>We check the product and destination before you pay.</p></li>
      <li><span>03</span><h2>Follow your delivery</h2><p>See purchase, warehouse, and shipping updates in one place.</p></li>
    </ol>
  </SiteShell>;
}
