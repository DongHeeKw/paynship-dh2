import { describe, it, expect } from 'vitest';
import { validateProductUrl } from '../product-url';
describe('all catalog sellers enter the reviewed purchasing flow', () => {
  it.each([
    'https://www.romand.co.kr/product/detail.html?product_no=958',
    'https://roundlab.co.kr/product/detail.html?product_no=36',
    'https://wiggle-wiggle.com/product/detail.html?product_no=2981',
    'https://shop.weverse.io/ko/shop/KRW/artists/7/sales/13690',
  ])('accepts a concrete Korean product: %s', url => expect(validateProductUrl(url)).toBe(url));
  it.each([
    'https://roundlab.co.kr.evil.test/product/detail.html?product_no=36',
    'https://roundlab.co.kr/product/detail.html',
    'https://roundlab.co.kr/product/detail.html?product_no=36&product_no=37',
    'https://roundlab.co.kr:8443/product/detail.html?product_no=36',
    'https://user@roundlab.co.kr/product/detail.html?product_no=36',
    'https://shop.weverse.io/en/shop/USD/artists/7/sales/13690',
  ])('rejects ambiguous or unrelated listings: %s', url => expect(() => validateProductUrl(url)).toThrow());
});
