import { CATEGORY_LABELS, countryName, formatDate } from './labels';
import type { ProductCategory } from '@/lib/purchases/categories';
import type { PurchaseSummary } from './types';
export default function PurchaseFacts({ request }: { request: PurchaseSummary }) {
  return <section className="detail-section"><h2 className="section-heading">Product & destination</h2><dl className="detail-grid"><dt>Product link</dt><dd><a href={request.sourceUrl} rel="noopener noreferrer" target="_blank">{request.sourceUrl}</a></dd><dt>Category</dt><dd>{CATEGORY_LABELS[request.category as ProductCategory] || request.category}</dd><dt>Quantity</dt><dd>{request.quantity}</dd><dt>Options</dt><dd>{request.options || 'None specified'}</dd><dt>Destination</dt><dd>{countryName(request.destination)}</dd><dt>Submitted</dt><dd>{formatDate(request.createdAt)}</dd></dl></section>;
}
