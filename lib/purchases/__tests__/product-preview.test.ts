import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProductPreview } from '../product-preview';

afterEach(() => vi.unstubAllGlobals());

describe('public preliminary product information', () => {
  it('only exposes dated observations for the exact previously collected product', () => {
    const result = getProductPreview('https://www.yes24.com/Product/Goods/13137546?utm_source=test#detail');
    expect(result).toMatchObject({
      state: 'SUPPORTED', merchant: 'Yes24',
      observation: { name: '소년이 온다', price: '13500', currency: 'KRW', retrievedAt: '2026-10-11T15:18:56.291Z' },
    });
    expect(result).not.toHaveProperty('hsCode');
    expect(result).not.toHaveProperty('tax');
  });

  it('leaves other supported product facts unknown, including previously blocked pages', () => {
    for (const url of ['https://www.yes24.com/product/goods/1234', 'https://www.musinsa.com/products/5132111', 'https://product.kyobobook.co.kr/detail/S000000610612']) {
      expect(getProductPreview(url)).toMatchObject({ state: 'SUPPORTED', observation: null });
    }
  });

  it('does not turn historical sold-out observations into a current availability claim', () => {
    expect(getProductPreview('https://www.yes24.com/product/goods/90164265')).toMatchObject({
      observation: { availability: 'https://schema.org/SoldOut' },
    });
  });

  it('keeps the entered Naver shop and product separate from unrelated Yes24 observations', () => {
    const result = getProductPreview('https://brand.naver.com/kinox/products/5912828061?site_preference=device&NaPm=ct%3Dmv4j1ck6%7Cci%3Dshopn');
    expect(result).toMatchObject({
      state: 'SUPPORTED', merchant: 'Naver Brand',
      canonicalUrl: 'https://brand.naver.com/kinox/products/5912828061',
      link: { storeSlug: 'kinox', productId: '5912828061' },
      lookup: { state: 'ROBOTS_BLOCKED', attemptedAt: expect.any(String) },
      observation: null,
    });
    expect(result).not.toHaveProperty('name');
    expect(result).not.toHaveProperty('price');
  });

  it('does not borrow collection results from a different product in the same Naver shop', () => {
    expect(getProductPreview('https://brand.naver.com/kinox/products/5912828062')).toMatchObject({
      state: 'SUPPORTED', link: { productId: '5912828062' }, lookup: { state: 'NOT_COLLECTED' }, observation: null,
    });
  });

  it.each(['https://www.yes24.com.attacker.example/product/goods/13137546', 'https://user:pass@www.yes24.com/product/goods/13137546', 'https://127.0.0.1/product/goods/13137546', 'http://www.yes24.com/product/goods/13137546'])('rejects unsupported URL %s before login', url => {
    expect(getProductPreview(url).state).toBe('UNSUPPORTED');
  });

  it('never fetches user-selected external links', () => {
    const fetch = vi.fn(() => { throw new Error('External request forbidden'); });
    vi.stubGlobal('fetch', fetch);
    expect(getProductPreview('https://www.coupang.com/vp/products/123')).toMatchObject({ state: 'SUPPORTED', observation: null });
    expect(fetch).not.toHaveBeenCalled();
  });
});
