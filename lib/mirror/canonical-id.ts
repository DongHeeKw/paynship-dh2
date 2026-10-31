/**
 * PayNShip v2.1 — Canonical ID 계산
 *
 * 같은 상품을 여러 사이트에서 스크래핑해도 동일한 canonical ID로 수렴.
 * Dedup을 위한 16자 SHA1 hash.
 */

import crypto from 'crypto';
import { normalizeBrand } from './brand-alias';

export interface CanonicalInput {
  /** 상품명 */
  title: string;
  /** 브랜드 */
  brand: string | null | undefined;
  /** 원산지 ISO 코드 (예: "KR") */
  originCountry?: string;
  /** 상품 URL (product code 추출) */
  sourceUrl?: string;
  /** 기존 추출된 product code (있으면 우선) */
  productCode?: string | null;
  /** 카테고리 힌트 (옷/전자제품 등) — dedup 정확도 향상 */
  category?: string | null;
}

/**
 * URL에서 product code 추출 시도.
 * 실패 시 null.
 */
export function extractProductCode(url: string): string | null {
  try {
    const u = new URL(url);

    // Pattern 1: /product/12345, /item/12345, /p/12345, /goods/12345
    const pathMatch = u.pathname.match(/\/(?:product|item|p|goods|products)\/([A-Za-z0-9_-]{3,})/i);
    if (pathMatch) return pathMatch[1];

    // Pattern 2: ?id=X, ?pid=X, ?productId=X, ?product_id=X
    for (const key of ['id', 'pid', 'productId', 'product_id', 'goodsNo', 'no', 'item_id']) {
      const v = u.searchParams.get(key);
      if (v && /^[A-Za-z0-9_-]{3,}$/.test(v)) return v;
    }

    // Pattern 3: hex-like last path segment (Shopify handle pattern도 포함)
    const segments = u.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && /^[A-Za-z0-9_-]{5,}$/.test(last)) return last;

    return null;
  } catch {
    return null;
  }
}

/**
 * 상품명 정규화 (공백/특수문자 제거 + 소문자 + 50자 제한)
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\-_.,()]/g, '')
    .replace(/[^\w가-힣]/g, '')
    .slice(0, 80);
}

/**
 * Canonical ID 계산 (16자 hash).
 *
 * 입력:
 *  - brand (normalized alias)
 *  - productCode (url에서 추출 또는 명시)
 *  - normalized title
 *  - originCountry
 *
 * 같은 상품이 쿠팡/29cm/브랜드몰에서 스크래핑되어도 같은 canonical ID 반환.
 */
export function computeCanonicalId(input: CanonicalInput): string {
  const brandKey = normalizeBrand(input.brand);
  const productCode = input.productCode ?? (input.sourceUrl ? extractProductCode(input.sourceUrl) : null);
  const normalizedTitle = normalizeTitle(input.title);
  const origin = (input.originCountry ?? 'KR').toUpperCase();
  const category = input.category ? normalizeTitle(input.category) : '';

  // productCode가 있으면 우선, 없으면 title 기반 (브랜드 동일 시)
  const components = [brandKey, productCode ?? '', normalizedTitle, origin, category]
    .filter(Boolean)
    .join('|');

  return crypto.createHash('sha1').update(components).digest('hex').slice(0, 16);
}

/**
 * Variant signature — 같은 상품 내에서 옵션 조합을 구별.
 * 예: [{name:"Size", value:"M"}, {name:"Color", value:"Red"}] → hash
 */
export function computeVariantSignature(options: Array<{ name: string; value: string }>): string {
  const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));
  const normalized = sorted.map(o => `${o.name.toLowerCase()}=${o.value.toLowerCase()}`).join(',');
  return crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 12);
}

/**
 * Shopify handle 생성 (URL-safe slug).
 * SEO 고려하여 상품명 기반 + 중복 방지용 canonical ID suffix.
 */
export function computeHandle(title: string, canonicalId: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'product'}-${canonicalId.slice(0, 8)}`;
}
