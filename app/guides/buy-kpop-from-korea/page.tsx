import type { Metadata } from 'next';
import Link from 'next/link';
import SiteShell from '@/components/site/SiteShell';

export const metadata: Metadata = {
  title: 'How to buy K-pop albums and merch from Korea | PayNShip',
  description: 'Compare album editions, random inclusions and seller benefits, then prepare a Korean product request with clear fees and destination review.',
};

export default function BuyingGuide() {
  return <SiteShell><article className="page-content reading-guide form-stack">
    <p className="eyebrow">THE COLLECTOR’S FIRST STEP</p><h1>How to buy K-pop albums and merch from Korea</h1>
    <p>A comeback wishlist can get complicated. Start with the exact product you want, then check its journey before paying.</p>
    <h2>1. Choose the edition, not just the artist</h2><p>Compare the seller’s edition name, number of discs and inclusions. Random photocards or covers do not guarantee your preferred member. Store benefits and preorder gifts can expire independently of the album.</p>
    <p>For example, <a href="https://www.yes24.com/product/goods/109196213" target="_blank" rel="noopener noreferrer">YES24’s BTS Proof Compact Edition</a> lists three CDs and random inclusions. Use the seller’s photos and description to confirm what you are requesting.</p>
    <h2>2. Look closely at light sticks and electronic merch</h2><p><a href="https://shop.weverse.io/ko/shop/KRW/artists/7/sales/13690" target="_blank" rel="noopener noreferrer">Weverse’s SEVENTEEN Official Light Stick Ver.3</a> lists AAA batteries as excluded. Battery type, packing and destination still need carrier review. A product’s size is not its packed parcel size.</p>
    <h2>3. Prepare your request</h2><p>Paste the Korean listing, select your options and quantity, and choose a destination. You can prepare a draft without an account. Sign in with a verified account to save delivery details and submit it.</p>
    <h2>4. Review the full cost before paying</h2><p>Our service fee is 15% of merchandise value. For example, $20 of merchandise adds a $3 service fee. Domestic shipping, international shipping, insurance, duty and tax are separate quoted amounts. A reference listing is not a confirmed price or stock reservation.</p>
    <h2>5. Wait for product and destination review</h2><p>Requests cover Vietnam, Thailand, the Philippines, Indonesia, China, Japan and the US. Availability depends on the item and route. Payment follows a reviewed quote, and shipping updates follow recorded fulfilment events.</p>
    <p><Link href="/purchase" className="primary-button">Prepare your first find ↗</Link></p>
    <p className="muted">Product references checked 15 November 2026. No artist or retailer affiliation.</p>
  </article></SiteShell>;
}
