import { createHash } from 'node:crypto';

export const REQUIRED_EVIDENCE_FIELDS = ['name', 'price', 'priceCurrency', 'sku', 'countryOfOrigin', 'material', 'packagedWeightKg', 'packagedDimensionsCm', 'hsCode'];

function clean(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  return String(value).replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 512) || null;
}

function attributes(tag) {
  const values = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    values[match[1].toLowerCase()] = clean(match[2] ?? match[3] ?? match[4]);
  }
  return values;
}

function structuredNodes(value, depth = 0) {
  if (!value || depth > 8) return [];
  if (Array.isArray(value)) return value.slice(0, 100).flatMap(item => structuredNodes(item, depth + 1));
  if (typeof value !== 'object') return [];
  return [value, ...structuredNodes(value['@graph'], depth + 1)];
}

/** Return observations only. Packaging, HS codes and eligibility are never inferred. */
export function extractEvidence(html, sourceUrl, retrievedAt = new Date().toISOString(), rawPageSha256 = undefined) {
  const pageSha256 = rawPageSha256 ?? createHash('sha256').update(html).digest('hex');
  const fields = {};
  const observe = (field, value, source) => {
    if (value === undefined || value === null || fields[field]) return;
    fields[field] = { value, source, sourceUrl, retrievedAt, pageSha256, status: 'observed' };
  };
  const nodes = [];
  for (const script of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].slice(0, 100)) {
    if (attributes(script[1]).type !== 'application/ld+json' || script[2].length > 256 * 1024) continue;
    try { nodes.push(...structuredNodes(JSON.parse(script[2]))); } catch { /* Malformed structured data is unknown. */ }
  }
  const hasType = (node, type) => [node['@type']].flat().includes(type);
  const products = nodes.filter(node => hasType(node, 'Product'));
  if (products.length === 1) {
    const product = products[0];
    for (const field of ['name', 'sku', 'gtin13', 'material', 'countryOfOrigin']) {
      observe(field, clean(product[field]?.name ?? product[field]), 'jsonld.Product.' + field);
    }
    observe('brand', clean(product.brand?.name ?? product.brand), 'jsonld.Product.brand');
    const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
    if (offers.length === 1 && offers[0]) {
      for (const field of ['price', 'priceCurrency', 'availability']) observe(field, clean(offers[0][field]), 'jsonld.Product.offers.' + field);
    }
  }
  const breadcrumb = nodes.find(node => hasType(node, 'BreadcrumbList'));
  if (Array.isArray(breadcrumb?.itemListElement)) {
    const names = breadcrumb.itemListElement.slice(0, 12).map(item => clean(item.name ?? item.item?.name)).filter(Boolean);
    if (names.length) observe('categoryBreadcrumbs', names, 'jsonld.BreadcrumbList');
  }
  const metadata = {};
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(tag[0]);
    if (attrs.content && (attrs.property || attrs.name)) metadata[attrs.property ?? attrs.name] = attrs.content;
  }
  for (const [field, metaKey] of [['name', 'og:title'], ['price', 'product:price:amount'], ['priceCurrency', 'product:price:currency']]) {
    observe(field, metadata[metaKey], 'meta.' + metaKey);
  }
  return { sourceUrl, retrievedAt, pageSha256, fields, missingFields: REQUIRED_EVIDENCE_FIELDS.filter(field => !fields[field]), customsStatus: 'review_required' };
}
