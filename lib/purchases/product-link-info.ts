import { validateProductUrl } from './product-url';

export interface ProductLinkInfo { productId: string; storeSlug?: string }

/** Identifiers encoded in a supported URL, never seller-verified product facts. */
export function getProductLinkInfo(input: string): ProductLinkInfo {
  const url = new URL(validateProductUrl(input));
  const segments = url.pathname.split('/').filter(Boolean);
  if (url.hostname === 'brand.naver.com' || url.hostname === 'smartstore.naver.com') {
    return { storeSlug: segments[0], productId: segments[2] };
  }
  if (url.hostname === 'www.oliveyoung.co.kr') return { productId: url.searchParams.get('goodsNo')! };
  if (url.hostname === 'item.gmarket.co.kr') return { productId: url.searchParams.get('goodscode')! };
  return { productId: segments[segments.length - 1] };
}
