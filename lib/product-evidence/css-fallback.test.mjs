import test from 'node:test';
import assert from 'node:assert/strict';
import { extractEvidence } from './extract.mjs';

// Synthetic markup: this exercises adapters, not current retailer availability.
const url = 'https://www.yes24.com/product/goods/109196213';
const html = '<h2 class="gd_name">Example &amp; album</h2><span class="nor_price"><em class="yes_m">19,300</em>원</span>';
test('CSS fallback records exact selector provenance and measured stages', () => {
  const result = extractEvidence(html, url);
  assert.equal(result.fields.name.value, 'Example & album');
  assert.equal(result.fields.price.value, '19300');
  assert.equal(result.fields.priceCurrency.value, 'KRW');
  assert.equal(result.fields.price.source, 'css:.nor_price .yes_m');
  assert.ok(result.timings.structuredMs >= 0);
  assert.ok(result.timings.cssMs >= 0);
  assert.ok(result.missingFields.includes('packagedWeightKg'));
  assert.equal(result.customsStatus, 'review_required');
});
test('structured facts win; CSS cannot resolve ambiguous structured offers', () => {
  const structured = offers => '<script type="application/ld+json">' + JSON.stringify({ '@type': 'Product', name: 'Structured album', offers }) + '</script>';
  const exact = extractEvidence(structured({ price: 20000, priceCurrency: 'KRW' }) + html, url);
  assert.equal(exact.fields.price.value, '20000');
  assert.equal(exact.timings.cssMs, null);
  const ambiguous = extractEvidence(structured([{ price: 1 }, { price: 2 }]) + html, url);
  assert.equal(ambiguous.fields.price, undefined);
  assert.equal(ambiguous.fields.priceCurrency, undefined);
});
test('missing, duplicate, range, hidden and unsupported selectors stay unknown', () => {
  for (const content of ['', html + html, html.replace('19,300', '19,300 ~ 20,000'), html.replace('19,300', '-100'), html.replace('class="nor_price"', 'hidden class="nor_price"')]) {
    assert.equal(extractEvidence(content, url).fields.price, undefined);
  }
  assert.equal(extractEvidence(html, 'https://smartstore.naver.com/test/products/1').fields.price, undefined);
});
test('fallback never mixes a CSS KRW price with an unrelated metadata currency', () => {
  const result = extractEvidence('<meta property="product:price:currency" content="USD">' + html, url);
  assert.equal(result.fields.price, undefined);
});
test('oversize HTML is rejected before either parsing stage', () => {
  assert.throws(() => extractEvidence('x'.repeat(2 * 1024 * 1024 + 1), url), /response_too_large/);
});

test('Naver semantic and Coupang adapters work without generated class guesses', () => {
  const naver = '<div itemtype="https://schema.org/Product"><h1 itemprop="name">Sample album</h1><div itemprop="offers"><meta itemprop="price" content="12000"></div></div>';
  for (const host of ['brand.naver.com', 'smartstore.naver.com']) {
    const result = extractEvidence(naver, `https://${host}/sample/products/1`);
    assert.equal(result.fields.price.value, '12000');
    assert.equal(result.fields.name.value, 'Sample album');
  }
  const coupang = '<h1 class="prod-buy-header__title">Sample album</h1><div class="prod-sale-price"><span class="total-price"><strong>12,000</strong></span></div>';
  assert.equal(extractEvidence(coupang, 'https://www.coupang.com/vp/products/1').fields.price.value, '12000');
  assert.equal(extractEvidence(coupang + '<select><option>A</option><option>B</option></select>', 'https://www.coupang.com/vp/products/1').fields.price, undefined);
});
