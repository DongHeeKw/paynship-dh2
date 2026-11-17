import { load } from 'cheerio';

// Conservative adapters. Missing or changed markup stays unknown. Naver's
// generated class names are deliberately excluded; semantic attributes only.
const adapters = {
  'www.yes24.com': { name: 'h2.gd_name', price: '.nor_price .yes_m' },
  'www.coupang.com': { name: '.prod-buy-header__title', price: '.prod-sale-price .total-price > strong' },
  'smartstore.naver.com': { name: '[itemtype="https://schema.org/Product"] [itemprop="name"]', price: '[itemtype="https://schema.org/Product"] [itemprop="offers"] [itemprop="price"]' },
  'brand.naver.com': { name: '[itemtype="https://schema.org/Product"] [itemprop="name"]', price: '[itemtype="https://schema.org/Product"] [itemprop="offers"] [itemprop="price"]' },
};

export function cssObservations(html, sourceUrl, { allowPrice }) {
  const adapter = adapters[new URL(sourceUrl).hostname];
  if (!adapter) return [];
  // No scripts execute, no remote resources load, and HTML is bounded by caller.
  const $ = load(html);
  const observations = [];
  function single(selector) {
    const nodes = $(selector);
    if (nodes.length !== 1 || nodes.parents().addBack().is('[hidden], [aria-hidden="true"], [style*="display:none"], [style*="display: none"]')) return null;
    return (nodes.attr('content') ?? nodes.text()).replace(/\s+/g, ' ').trim().slice(0, 512) || null;
  }
  const name = single(adapter.name);
  if (name) observations.push(['name', name, 'css:' + adapter.name]);
  const price = allowPrice && $('select option').length <= 1 ? single(adapter.price) : null;
  if (price && /^(?:[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\s*원)?$/.test(price)) {
    observations.push(['price', price.replace(/[,\s원]/g, ''), 'css:' + adapter.price]);
    observations.push(['priceCurrency', 'KRW', 'css:retailer-KRW-adapter']);
  }
  return observations;
}
