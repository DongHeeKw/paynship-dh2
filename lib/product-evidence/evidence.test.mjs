import test from 'node:test';
import assert from 'node:assert/strict';
import { productUrl } from './product-url.mjs';
import { isPublicAddress, pinnedAddress } from './network-policy.mjs';
import { robotsPermits } from './robots.mjs';
import { extractEvidence, selectObservedVariant } from './extract.mjs';

test('product URL policy rejects credentials, lookalike hosts and arbitrary paths', () => {
  for (const url of ['http://www.yes24.com/product/goods/1', 'https://www.yes24.com.evil.test/product/goods/1',
    'https://user:pass@www.yes24.com/product/goods/1', 'https://www.yes24.com/admin', 'https://127.0.0.1/product/goods/1']) {
    assert.throws(() => productUrl(url));
  }
  assert.equal(productUrl('https://www.yes24.com/Product/Goods/13137546?tracking=1#fragment').href,
    'https://www.yes24.com/Product/Goods/13137546');
});

test('DNS policy rejects private, link local and reserved IPv4/IPv6 ranges', () => {
  for (const address of ['127.0.0.1', '10.1.1.1', '169.254.169.254', '172.16.1.2', '192.168.1.1',
    '100.64.0.1', '198.18.0.1', '203.0.113.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('robots policies use specific groups and longest path rules', () => {
  const text = 'User-agent: *\nDisallow: /\nUser-agent: PayNShipEvidence\nDisallow: /products/\nAllow: /products/42$';
  assert.equal(robotsPermits(text, '/products/42'), true);
  assert.equal(robotsPermits(text, '/products/420'), false);
  assert.throws(() => robotsPermits('<html>bot challenge</html>', '/products/42'));
});

test('equivalent expanded IPv6 addresses cannot bypass reserved-prefix checks', () => {
  for (const address of ['2001:db8::1', '2001:0db8::1', '2001:0DB8:0000:0000:0000:0000:0000:0001',
    '2001:0000:0000:0000:0000:0000:0000:0001', '2002:0000:0000:0000:0000:0000:0000:0001',
    '2001:2::1', '2001:20::1', '3fff:fff::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('2606:4700:0000:0000:0000:0000:0000:1111'), true);
});

test('oversized robots policies fail closed instead of ignoring a late disallow', () => {
  const lines = 'User-agent: *\n' + '# comment\n'.repeat(5000) + 'Disallow: /products/';
  assert.throws(() => robotsPermits(lines, '/products/42'), /robots_line_limit_exceeded/);
  const rules = 'User-agent: *\n' + 'Allow: /unrelated\n'.repeat(300) + 'Disallow: /products/';
  assert.throws(() => robotsPermits(rules, '/products/42'), /robots_rule_limit_exceeded/);
  const distributed = 'User-agent: OtherCrawler\n' + 'Disallow: /unrelated\n'.repeat(200) +
    'User-agent: *\n' + 'Allow: /unrelated\n'.repeat(100) + 'Disallow: /products/';
  assert.throws(() => robotsPermits(distributed, '/products/42'), /robots_rule_limit_exceeded/);
});

test('DNS pinning rejects a mixed public/private answer and pins one validated address', async () => {
  await assert.rejects(pinnedAddress('www.yes24.com', async () => [
    { address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 },
  ]), /unsafe_dns_address/);
  const address = await pinnedAddress('www.yes24.com', async () => [
    { address: '2606:4700:4700::1111', family: 6 }, { address: '8.8.8.8', family: 4 },
  ]);
  assert.deepEqual(address, { address: '8.8.8.8', family: 4 });
});

test('structured evidence remains unverified and customs fields stay unknown', () => {
  const html = '<script type="application/ld+json">{"@type":"Product","name":"Sample Book","sku":"42",' +
    '"offers":{"price":"10000","priceCurrency":"KRW"}}</script>';
  const result = extractEvidence(html, 'https://www.yes24.com/product/goods/42', '2026-10-12T00:00:00Z');
  assert.equal(result.fields.name.value, 'Sample Book');
  assert.equal(result.fields.name.status, 'observed');
  assert.equal(result.fields.name.source, 'jsonld.Product.name');
  assert.equal(result.customsStatus, 'review_required');
  assert.ok(result.missingFields.includes('hsCode'));
  assert.ok(result.missingFields.includes('packagedWeightKg'));
  assert.match(result.pageSha256, /^[a-f0-9]{64}$/);
});

test('multiple product offers are ambiguous and not silently selected', () => {
  const html = '<script type="application/ld+json">[{"@type":"Product","name":"A","offers":{"price":1}},' +
    '{"@type":"Product","name":"B","offers":{"price":2}}]</script>';
  assert.equal(extractEvidence(html, 'https://www.yes24.com/product/goods/42').fields.price, undefined);
});

test('variant selection preserves the exact size/colour/model and its own price evidence', () => {
  const product = (sku, color, price) => ({ '@type': 'Product', name: 'Test shirt', sku, color, size: 'M', model: '2026', material: 'Cotton', countryOfOrigin: { name: 'Vietnam' }, offers: { '@type': 'Offer', price, priceCurrency: 'KRW' } });
  const group = { '@type': 'ProductGroup', hasVariant: [product('blue-m', 'Blue', '10000'), product('red-m', 'Red', '12000')] };
  const evidence = extractEvidence(`<script type="application/ld+json">${JSON.stringify(group)}</script><meta property="product:price:amount" content="1"><meta property="product:price:currency" content="KRW">`, 'https://www.musinsa.com/products/123');
  assert.equal(evidence.fields.price, undefined);
  assert.equal(selectObservedVariant(evidence, { size: 'M' }), null);
  assert.equal(selectObservedVariant(evidence, { size: 'L', color: 'Red' }), null);
  const selected = selectObservedVariant(evidence, { sku: 'red-m', size: 'M', color: 'Red', model: '2026' });
  assert.equal(selected.fields.price.value, '12000');
  assert.equal(selected.fields.countryOfOrigin.value, 'Vietnam');
  assert.equal(selected.fields.price.status, 'observed');
  assert.equal(selected.customsStatus, 'review_required');
});

test('aggregate or ambiguous offers cannot be replaced by a misleading page-level meta price', () => {
  for (const offers of [{ '@type': 'AggregateOffer', lowPrice: '100', highPrice: '500', price: '100', priceCurrency: 'KRW' }, [{ price: '100', priceCurrency: 'KRW' }, { price: '500', priceCurrency: 'KRW' }]]) {
    const html = `<script type="application/ld+json">${JSON.stringify({ '@type': 'Product', name: 'Test', offers })}</script><meta property="product:price:amount" content="1"><meta property="product:price:currency" content="KRW">`;
    assert.equal(extractEvidence(html, 'https://www.musinsa.com/products/123').fields.price, undefined);
  }
});

test('invalid prices and missing currency never become a usable price pair', () => {
  for (const offer of [{ price: '0', priceCurrency: 'KRW' }, { price: '-100', priceCurrency: 'KRW' }, { price: '10,000', priceCurrency: 'KRW' }, { price: '10.5', priceCurrency: 'KRW' }, { price: '10000' }]) {
    const html = `<script type="application/ld+json">${JSON.stringify({ '@type': 'Product', offers: offer })}</script>`;
    assert.equal(extractEvidence(html, 'https://www.musinsa.com/products/123').fields.price, undefined);
  }
});

test('seller product dimensions never become verified shipping or customs data', () => {
  const html = '<script type="application/ld+json">{"@type":"Product","weight":0.1,"height":10,"width":10,"depth":10,"countryOfOrigin":"KR","size":"M","color":"Blue","model":"T1"}</script>';
  const evidence = extractEvidence(html, 'https://www.musinsa.com/products/123');
  assert.equal(evidence.fields.size.value, 'M');
  assert.equal(evidence.fields.packagedWeightKg, undefined);
  assert.equal(evidence.fields.packagedDimensionsCm, undefined);
  assert.equal(evidence.fields.hsCode, undefined);
  assert.equal(evidence.customsStatus, 'review_required');
});
