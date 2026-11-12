import samples from '@/data/samples/product-evidence-2026-10-12.json';
import naverSamples from '@/data/samples/naver-product-evidence-2026-10-12.json';
import { validateProductUrl } from './product-url';
import { getProductLinkInfo, type ProductLinkInfo } from './product-link-info';

const MERCHANT_LABELS: Record<string, string> = {
  'www.coupang.com': 'Coupang', 'smartstore.naver.com': 'Naver Smart Store',
  'brand.naver.com': 'Naver Brand', 'www.musinsa.com': 'Musinsa', 'www.29cm.co.kr': '29CM',
  'www.oliveyoung.co.kr': 'Olive Young', 'item.gmarket.co.kr': 'Gmarket',
  'www.yes24.com': 'Yes24', 'product.kyobobook.co.kr': 'Kyobo',
};

interface ObservedField { value: string; status: string }
export interface ProductObservation {
  retrievedAt: string;
  name?: string;
  price?: string;
  currency?: string;
  availability?: string;
  sku?: string; model?: string; size?: string; color?: string; material?: string; countryOfOrigin?: string;
}
export interface ProductLookup {
  state: 'OBSERVED' | 'NOT_COLLECTED' | 'ROBOTS_BLOCKED' | 'UNAVAILABLE';
  attemptedAt?: string;
}
export type ProductPreviewResult =
  | { state: 'EMPTY' }
  | { state: 'UNSUPPORTED'; message: string }
  | { state: 'SUPPORTED'; canonicalUrl: string; merchant: string; link: ProductLinkInfo; lookup: ProductLookup; observation: ProductObservation | null };

const collectedProducts = [...samples.products, ...naverSamples.products];

function comparisonKey(value: string): string {
  const url = new URL(validateProductUrl(value));
  if (url.hostname === 'www.yes24.com') url.pathname = url.pathname.toLowerCase().replace(/\/$/, '');
  return url.toString();
}

function observedValue(fields: Record<string, ObservedField>, key: string): string | undefined {
  const field = fields[key];
  return field?.status === 'observed' && typeof field.value === 'string' ? field.value : undefined;
}

/** Public observations are a dated local sample, never a live fetch or a customs decision. */
export function getProductPreview(input: string): ProductPreviewResult {
  if (!input.trim()) return { state: 'EMPTY' };
  try {
    const canonicalUrl = validateProductUrl(input.trim());
    const merchant = MERCHANT_LABELS[new URL(canonicalUrl).hostname];
    const link = getProductLinkInfo(canonicalUrl);
    const matchingSample = collectedProducts.find(sample => comparisonKey(sample.sourceUrl) === comparisonKey(canonicalUrl));
    let observation: ProductObservation | null = null;
    if (matchingSample?.fetchStatus === 'fetched') {
      const fields = matchingSample.fields as Record<string, ObservedField>;
      observation = {
        retrievedAt: matchingSample.retrievedAt,
        name: observedValue(fields, 'name'), price: observedValue(fields, 'price'),
        currency: observedValue(fields, 'priceCurrency'), availability: observedValue(fields, 'availability'),
        sku: observedValue(fields, 'sku'), model: observedValue(fields, 'model'), size: observedValue(fields, 'size'), color: observedValue(fields, 'color'),
        material: observedValue(fields, 'material'), countryOfOrigin: observedValue(fields, 'countryOfOrigin'),
      };
      if (!observation.name && !observation.price && !observation.currency && !observation.availability) observation = null;
    }
    const lookup: ProductLookup = !matchingSample ? { state: 'NOT_COLLECTED' }
      : { state: observation ? 'OBSERVED' : matchingSample.fetchStatus === 'robots_blocked' ? 'ROBOTS_BLOCKED' : 'UNAVAILABLE', attemptedAt: matchingSample.retrievedAt };
    return { state: 'SUPPORTED', canonicalUrl, merchant, link, lookup, observation };
  } catch {
    return { state: 'UNSUPPORTED', message: 'Use a supported HTTPS product page from Coupang, Naver, Musinsa, 29CM, Olive Young, Gmarket, Yes24, or Kyobo.' };
  }
}
