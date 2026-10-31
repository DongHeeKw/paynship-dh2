/** Shared, pure URL policy used by request intake and the operator evidence collector. */
const PRODUCT_PATHS = new Map([
  ['www.coupang.com', /^\/vp\/products\/\d+\/?$/],
  ['smartstore.naver.com', /^\/[^/]+\/products\/\d+\/?$/],
  ['brand.naver.com', /^\/[^/]+\/products\/\d+\/?$/],
  ['www.musinsa.com', /^\/(?:products|app\/goods)\/\d+\/?$/],
  ['www.29cm.co.kr', /^\/products\/\d+\/?$/],
  ['www.oliveyoung.co.kr', /^\/store\/goods\/getGoodsDetail\.do$/],
  ['item.gmarket.co.kr', /^\/Item$/i],
  ['www.yes24.com', /^\/product\/goods\/\d+\/?$/i],
  ['product.kyobobook.co.kr', /^\/detail\/S\d+\/?$/],
]);

export function productUrl(value) {
  const url = new URL(value);
  if (value.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port ||
      !PRODUCT_PATHS.get(url.hostname)?.test(url.pathname)) throw new Error('unsupported_product_url');
  if (url.hostname === 'www.oliveyoung.co.kr' && !/^[A-Za-z0-9]+$/.test(url.searchParams.get('goodsNo') ?? '')) {
    throw new Error('missing_product_identifier');
  }
  if (url.hostname === 'item.gmarket.co.kr' && !/^\d+$/.test(url.searchParams.get('goodscode') ?? '')) {
    throw new Error('missing_product_identifier');
  }
  for (const key of [...url.searchParams.keys()]) {
    if (!['itemId', 'vendorItemId', 'goodsNo', 'goodscode'].includes(key)) url.searchParams.delete(key);
  }
  url.hash = '';
  return url;
}
