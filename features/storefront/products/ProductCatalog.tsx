'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { IntakeDraft } from '@/lib/purchases/intake-draft';
import Link from 'next/link';
import references from '../catalog/references.json';
import { useProductDraft } from './useProductDraft';
import { usePurchaseClient } from '@/components/purchases/PurchaseClient';
import { catalogHref, catalogPage } from '../catalog/pagination';
import { CATALOG_CATEGORIES, catalogCategory, categoryLabel } from '../catalog/categories';
import './products.css';

export default function ProductCatalog() {
  const router = useRouter();
  const { href } = usePurchaseClient();
  const search = useSearchParams();
  const { error, prepare } = useProductDraft();
  const [destination, setDestination] = useState<IntakeDraft['destination']>('');
  const view = catalogPage(references.items, { category: search.get('category'), type: search.get('type'), page: search.get('page'), q: search.get('q') });

  return <div className="products-page">
    <header className="products-heading">
      <p className="parcel-section-label">THE PRODUCT SHELF</p>
      <h1>Find your next <span>favourite<svg viewBox="0 0 300 12" fill="none" aria-hidden="true"><path d="M3 8Q140-1 297 5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg>.</span></h1>
      <p>Little everyday joys, straight from Korea. Explore beauty, stationery, home favourites and more.</p>
    </header>
    <form className="catalog-search" key={search.get('q') ?? ''} onSubmit={event => {
      event.preventDefault(); const query = String(new FormData(event.currentTarget).get('q') ?? '');
      router.push(href(catalogHref(view.category, 1, query)));
    }}><label htmlFor="catalog-search">Search Korean finds</label><div><input id="catalog-search" name="q" maxLength={120} defaultValue={search.get('q') ?? ''} placeholder="Product or brand" /><button className="primary-button">Search</button></div></form>
    <div className="products-toolbar">
      <label className="products-category" htmlFor="product-category">
        <span>Category</span>
        <span className="products-select">
          <svg className="products-select-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
          <select id="product-category" value={view.category} onChange={event => router.push(href(catalogHref(catalogCategory(event.target.value), 1, search.get('q') ?? '')))}>
            {CATALOG_CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
          <svg className="products-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </label>
      <label className="products-destination">Ship to<select value={destination} onChange={event => setDestination(event.target.value as IntakeDraft['destination'])} aria-label="Shopping destination">
        <option value="">Choose your destination</option><option value="US">United States</option><option value="JP">Japan</option><option value="CN">China</option>
      </select></label>
      <span role="status">Showing {view.start}–{view.end} of {view.total}</span>
    </div>
    <p className="catalog-evidence-note">Seller references · current price, exact options, origin and destination eligibility need review. No duties-included offer is confirmed here.</p>
    {view.total === 0 && <p role="status">No matching references. Try another search or category.</p>}
    <div className="products-grid">
      {view.items.map(item => <article className={`product-card product-card-${item.shelf}`} key={item.id}>
        <div className="product-card-top"><span>{categoryLabel(item.shelf)}</span><span aria-hidden="true">↗</span></div>
        <a className="product-photo" href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${item.brand} ${item.name} at ${item.seller} (opens in a new tab)`}>
          {/* Local seller photos keep the catalog independent of third-party image requests. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt={`${item.brand} ${item.name} — seller product photo`} width={720} height={720} />
        </a>
        <div className="product-copy">
          <p className="product-brand">{item.brand}<span>{item.seller}</span></p>
          <h2>{item.name}</h2>
          <p className="product-description">{item.description}</p>
          <p className="product-review">{item.reviewNote}</p>
          <div className="product-actions">
            <button type="button" onClick={() => prepare(item, destination)}>{item.action}<span aria-hidden="true">↗</span></button>
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Seller listing <span className="sr-only">for {item.brand} (opens in a new tab)</span><span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </article>)}
    </div>
    <nav className="products-pagination" aria-label="Product pages">
      <button type="button" disabled={view.page === 1} onClick={() => router.push(href(catalogHref(view.category, view.page - 1, search.get('q') ?? '')))} aria-label="Previous page">← <span>Previous</span></button>
      <div>{Array.from({ length: view.pages }, (_, index) => index + 1).map(page => <Link key={page} href={href(catalogHref(view.category, page, search.get('q') ?? ''))} aria-label={`Page ${page}`} aria-current={view.page === page ? 'page' : undefined}>{page}</Link>)}</div>
      <button type="button" disabled={view.page === view.pages} onClick={() => router.push(href(catalogHref(view.category, view.page + 1, search.get('q') ?? '')))} aria-label="Next page"><span>Next</span> →</button>
    </nav>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="products-footer"><Link href="/guides/how-it-works">Buying, shipping &amp; returns</Link><Link href="/guides/buy-kpop-from-korea">Read the K-pop buying guide</Link></div>
    <p className="products-source">Seller photographs; original listings linked on each card. Price, options and availability are confirmed during review. The service fee is 15% of merchandise value, with no minimum; shipping and taxes are separate.</p>
  </div>;
}
