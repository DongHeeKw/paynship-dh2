import { describe, expect, it } from 'vitest';
import { getProductLinkInfo } from '../product-link-info';

describe('product identifiers from supported links', () => {
  it.each([
    ['https://brand.naver.com/kinox/products/5912828061?NaPm=tracking#details', { storeSlug: 'kinox', productId: '5912828061' }],
    ['https://smartstore.naver.com/sample/products/456/', { storeSlug: 'sample', productId: '456' }],
    ['https://www.coupang.com/vp/products/123?itemId=456&vendorItemId=789', { productId: '123' }],
    ['https://www.musinsa.com/app/goods/123/', { productId: '123' }],
    ['https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A123&utm_source=sample', { productId: 'A123' }],
    ['https://item.gmarket.co.kr/Item?goodscode=123', { productId: '123' }],
  ])('uses the product identifier rather than a tracking or variant value: %s', (url, expected) => {
    expect(getProductLinkInfo(url)).toEqual(expected);
  });
  it('checks the shared URL policy before extracting untrusted input', () => {
    expect(() => getProductLinkInfo('https://brand.naver.com.attacker.test/kinox/products/5912828061')).toThrow();
    expect(() => getProductLinkInfo('https://brand.naver.com/kinox/products/not-a-number')).toThrow();
  });
});
