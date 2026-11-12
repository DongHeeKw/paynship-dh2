import { createHash } from 'node:crypto';

export const REQUIRED_EVIDENCE_FIELDS = ['name', 'price', 'priceCurrency', 'sku', 'model', 'size', 'color', 'countryOfOrigin', 'material', 'packagedWeightKg', 'packagedDimensionsCm', 'hsCode'];

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
  return [value, ...structuredNodes(value['@graph'], depth + 1), ...structuredNodes(value.hasVariant, depth + 1)];
}

const hasType = (node, type) => [node['@type']].flat().some(value => typeof value === 'string' && value.split(/[/:]/).pop() === type);

function readProduct(product, observe, ambiguities) {
  for (const field of ['name', 'sku', 'gtin13', 'model', 'size', 'color', 'material', 'countryOfOrigin']) {
    observe(field, clean(product[field]?.name ?? product[field]), 'jsonld.Product.' + field);
  }
  observe('brand', clean(product.brand?.name ?? product.brand), 'jsonld.Product.brand');
  const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
  if (offers.length !== 1 || !offers[0] || hasType(offers[0], 'AggregateOffer')) {
    if (offers.filter(Boolean).length) ambiguities.push('ambiguous_or_aggregate_offers');
    return;
  }
  const offer = offers[0];
  const price = clean(offer.price), currency = clean(offer.priceCurrency);
  // Accept an explicit positive price/currency pair, never a range, zero or a from-price.
  if (price && /^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(price) && Number(price) > 0 && currency && /^[A-Z]{3}$/.test(currency)
    && !(currency === 'KRW' && !Number.isInteger(Number(price)))) {
    observe('price', price, 'jsonld.Product.offers.price');
    observe('priceCurrency', currency, 'jsonld.Product.offers.priceCurrency');
  } else if (offer.price !== undefined) ambiguities.push('invalid_price_or_currency');
  observe('availability', clean(offer.availability), 'jsonld.Product.offers.availability');
}

/** Return observations only. Packaging, HS codes and eligibility are never inferred. */
export function extractEvidence(html, sourceUrl, retrievedAt = new Date().toISOString(), rawPageSha256 = undefined) {
  if (typeof html !== 'string' || Buffer.byteLength(html, 'utf8') > 2 * 1024 * 1024) throw new Error('response_too_large');
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
  const products = nodes.filter(node => hasType(node, 'Product'));
  const ambiguities = [];
  const variants = products.slice(0, 100).map(product => {
    const variantFields = {};
    const variantAmbiguities = [];
    readProduct(product, (field, value, source) => { if (value !== null && value !== undefined) variantFields[field] = { value, source, sourceUrl, retrievedAt, pageSha256, status: 'observed' }; }, variantAmbiguities);
    return { fields: variantFields, ambiguities: variantAmbiguities, status: 'observed', customsStatus: 'review_required' };
  });
  if (products.length === 1) {
    readProduct(products[0], observe, ambiguities);
  } else if (products.length > 1) {
    ambiguities.push('select_exact_variant');
  }
  if (products.length > 100) ambiguities.push('variant_limit_exceeded');
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
  // Meta tags cannot resolve conflicting variants/offers or supply half a price pair.
  if (products.length === 0) {
    observe('name', metadata['og:title'], 'meta.og:title');
    const price = metadata['product:price:amount'], currency = metadata['product:price:currency'];
    if (price && /^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(price) && Number(price) > 0 && currency && /^[A-Z]{3}$/.test(currency)
      && !(currency === 'KRW' && !Number.isInteger(Number(price)))) {
      observe('price', price, 'meta.product:price:amount');
      observe('priceCurrency', currency, 'meta.product:price:currency');
    }
  }
  return { sourceUrl, retrievedAt, pageSha256, fields, variants, ambiguities, missingFields: REQUIRED_EVIDENCE_FIELDS.filter(field => !fields[field]), customsStatus: 'review_required' };
}

/** Exact conjunctive selection; never invent size/colour combinations or pick the cheapest variant. */
export function selectObservedVariant(evidence, selection) {
  const keys = ['sku', 'model', 'size', 'color'];
  const selected = keys.filter(key => typeof selection?.[key] === 'string' && selection[key].trim());
  if (!selected.length || evidence?.ambiguities?.includes('variant_limit_exceeded')) return null;
  const matches = (evidence?.variants ?? []).filter(variant => selected.every(key => variant.fields[key]?.value === selection[key].trim()));
  return matches.length === 1 ? matches[0] : null;
}
