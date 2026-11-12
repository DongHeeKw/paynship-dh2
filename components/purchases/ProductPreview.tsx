import { getCountryCustomsPolicy, countryPolicyNeedsRefresh } from '@/lib/customs/country-policy';
import { RESTRICTED_CATEGORIES } from '@/lib/purchases/categories';
import type { IntakeDraft } from '@/lib/purchases/intake-draft';
import type { ProductPreviewResult } from '@/lib/purchases/product-preview';
import { countryName } from './labels';

interface Props { draft: IntakeDraft; product: ProductPreviewResult }

function observationTime(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(new Date(value));
}

export default function ProductPreview({ draft, product }: Props) {
  const country = draft.destination ? getCountryCustomsPolicy(draft.destination) : null;
  const restricted = RESTRICTED_CATEGORIES.includes(draft.category);
  return <section className="form-stack" aria-label="Product and destination information" aria-live="polite">
    {product.state === 'SUPPORTED' && <div className="notice">
      <p><strong>{product.merchant} product link recognised.</strong> We still need to verify the product, options, and current price.</p>
      <div className="form-stack text-sm">
        {product.link.storeSlug && <p>Store from link: <strong>{product.link.storeSlug}</strong></p>}
        <p>Product ID from link: <strong>{product.link.productId}</strong></p>
        <p><a className="text-button" href={product.canonicalUrl} target="_blank" rel="noopener noreferrer">Open the entered product</a></p>
      </div>
      {product.observation ? <div className="form-stack">
        {product.observation.name && <p><strong>{product.observation.name}</strong></p>}
        {product.observation.price && product.observation.currency && <p>Observed seller price: {product.observation.price} {product.observation.currency}</p>}
        {(['sku', 'model', 'size', 'color', 'material', 'countryOfOrigin'] as const).map(field => product.observation?.[field] ? <p key={field}>{({ sku: 'SKU', model: 'Model', size: 'Size', color: 'Colour', material: 'Material', countryOfOrigin: 'Seller-stated origin' })[field]}: {product.observation[field]}</p> : null)}
        {product.observation.availability?.endsWith('/SoldOut') && <p>This sample page reported sold out when collected.</p>}
        <p className="muted">Local sample collected {observationTime(product.observation.retrievedAt)} KST. This is historical information; current price and availability are unverified. Shipping, duties, and taxes are not included.</p>
      </div> : <div className="form-stack">
        <p>{product.lookup.state === 'ROBOTS_BLOCKED'
          ? 'The seller does not allow this automated lookup. Product name, current price and availability need an operator check.'
          : product.lookup.state === 'UNAVAILABLE'
            ? 'Product details could not be collected in the last lookup. An operator needs to check the seller page.'
            : 'Product details have not been collected for this link. An operator needs to check the seller page.'}</p>
        {product.lookup.attemptedAt && <p className="muted">Saved lookup result from {observationTime(product.lookup.attemptedAt)} KST. No verified product details are available.</p>}
      </div>}
    </div>}
    {product.state === 'UNSUPPORTED' && <p className="error-message" role="status">{product.message}</p>}
    {restricted && <p className="notice">This category is outside our current service scope. Import and quarantine requirements vary by destination.</p>}
    {country && <div className="notice">
      <p><strong>Delivery to {countryName(country.country)}</strong></p>
      <p>{country.customerHint}</p>
      {countryPolicyNeedsRefresh(country.country) && <p>These requirements need an updated operator review before a quote.</p>}
      <p className="muted">A supported URL does not establish customs eligibility. We review product evidence, destination rules, recipient requirements, and shipping availability before you pay.</p>
      {country.sources.length > 0 && <details><summary>Official recipient information</summary><ul>{country.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul></details>}
    </div>}
    {!country && <p className="muted">Choose a destination to see recipient requirements. You can explore this information without an account.</p>}
  </section>;
}
