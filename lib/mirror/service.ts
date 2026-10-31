/**
 * PayNShip v2.1 — Auto-Mirror Service
 *
 * 스크래퍼 발견 상품을 Shopify Product로 lazy 미러링.
 * Canonical ID를 Shopify metafield에 저장 → dedup은 metafield query로 확인.
 *
 * MVP: Prisma cache 없이 Shopify가 SSoT. 성능 최적화는 Phase 2.
 */

import { shopifyV2Gql } from '@/lib/shopify/admin-v2';
import {
  createProduct,
  createProductOptions,
  createProductVariants,
  type CreatedProduct,
} from '@/lib/shopify/mutations-v2/product';
import { computeCanonicalId, computeHandle, computeVariantSignature, type CanonicalInput } from './canonical-id';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScrapedProductInput {
  title: string;
  brand: string;
  /** USD 단가 (환산된 값). 미환산 시 priceLocal + localCurrency 필요. */
  priceUsd: number;
  /** 원 판매처 URL */
  sourceUrl: string;
  /** 판매처 식별자 (coupang, 29cm, brand_official 등) */
  sourceStore?: string;
  /** 원산지 ISO 코드 */
  originCountry?: string;
  /** 선택 옵션 (variants) */
  options?: Array<{ name: string; value: string }>;
  /** 대표 이미지 URL (1장만 — 최소 필드) */
  imageUrl?: string;
  /** SKU / 바코드 */
  sku?: string;
  /** 스크래퍼 신뢰도 레벨 */
  scrapeLevel?: string;
  /** 카테고리 힌트 */
  category?: string;
}

export interface MirrorResult {
  /** canonical id for dedup */
  canonicalId: string;
  /** Shopify Product GID */
  productId: string;
  /** Shopify handle (PDP URL path) */
  handle: string;
  /** 방금 생성됐는지 (true) vs 기존 재사용 (false) */
  created: boolean;
  /** 이 input에 해당하는 Shopify Variant GID (있으면) */
  variantId?: string;
  /** 방금 variant 추가됐는지 */
  variantCreated?: boolean;
}

// ─── Metafield Lookup ──────────────────────────────────────────────────────

const FIND_BY_CANONICAL_QUERY = `
  query PayNShipFindByCanonical($query: String!) {
    products(first: 1, query: $query) {
      edges {
        node {
          id
          handle
          status
          metafields(first: 10, namespace: "paynship") {
            edges { node { key value } }
          }
          variants(first: 50) {
            edges {
              node {
                id
                selectedOptions { name value }
              }
            }
          }
          options {
            id
            name
            values
          }
        }
      }
    }
  }
`;

interface ExistingProductMeta {
  id: string;
  handle: string;
  status: string;
  canonicalId: string | null;
  variants: Array<{ id: string; options: Array<{ name: string; value: string }> }>;
  options: Array<{ id: string; name: string; values: string[] }>;
}

async function findExistingByCanonicalId(canonicalId: string): Promise<ExistingProductMeta | null> {
  // Shopify products query: metafield 기반 검색
  // metafield:paynship.canonical_id is not a standard search field in Admin API,
  // so we use tag-based search as fallback: products are tagged with `canonical:<id>`
  const queryStr = `tag:'pn-canonical:${canonicalId}'`;
  const data = await shopifyV2Gql<{
    products: {
      edges: Array<{
        node: {
          id: string;
          handle: string;
          status: string;
          metafields: { edges: Array<{ node: { key: string; value: string } }> };
          variants: { edges: Array<{ node: { id: string; selectedOptions: Array<{ name: string; value: string }> } }> };
          options: Array<{ id: string; name: string; values: string[] }>;
        };
      }>;
    };
  }>(FIND_BY_CANONICAL_QUERY, { query: queryStr });

  const edge = data.products.edges[0];
  if (!edge) return null;

  const metafield = edge.node.metafields.edges.find(e => e.node.key === 'canonical_id');
  return {
    id: edge.node.id,
    handle: edge.node.handle,
    status: edge.node.status,
    canonicalId: metafield?.node.value ?? null,
    variants: edge.node.variants.edges.map(v => ({
      id: v.node.id,
      options: v.node.selectedOptions,
    })),
    options: edge.node.options,
  };
}

// ─── Main Service ──────────────────────────────────────────────────────────

/**
 * Lazy Mirror: 스크래퍼 상품을 Shopify Product로 복제 (또는 기존 재사용).
 *
 * Flow:
 *  1. canonical id 계산
 *  2. Shopify에서 `tag:pn-canonical:<id>` 검색
 *  3. 있음: variant 매칭 확인 → 없으면 variant 추가
 *  4. 없음: productCreate (DRAFT, 최소 필드) + option/variant 생성
 */
export async function upsertMirrorFromScraped(input: ScrapedProductInput): Promise<MirrorResult> {
  const canonicalInput: CanonicalInput = {
    title: input.title,
    brand: input.brand,
    originCountry: input.originCountry,
    sourceUrl: input.sourceUrl,
    category: input.category,
  };
  const canonicalId = computeCanonicalId(canonicalInput);

  const existing = await findExistingByCanonicalId(canonicalId);

  if (existing) {
    // 기존 Product 재사용
    const variantSig = input.options ? computeVariantSignature(input.options) : '';
    const targetOptions = input.options ?? [];

    // 같은 옵션 조합의 variant 찾기
    let matchedVariantId: string | undefined;
    for (const v of existing.variants) {
      if (computeVariantSignature(v.options) === variantSig) {
        matchedVariantId = v.id;
        break;
      }
    }

    if (!matchedVariantId && input.options && input.options.length > 0) {
      // 새 옵션 조합 → variant 추가
      const created = await createProductVariants(existing.id, [
        {
          price: input.priceUsd.toFixed(2),
          sku: input.sku ?? canonicalId.slice(0, 12),
          options: input.options,
        },
      ]);
      matchedVariantId = created[0]?.id;
      return {
        canonicalId,
        productId: existing.id,
        handle: existing.handle,
        created: false,
        variantId: matchedVariantId,
        variantCreated: true,
      };
    }

    return {
      canonicalId,
      productId: existing.id,
      handle: existing.handle,
      created: false,
      variantId: matchedVariantId ?? existing.variants[0]?.id,
    };
  }

  // 신규 생성
  const handle = computeHandle(input.title, canonicalId);

  const product = await createProduct({
    title: input.title,
    handle,
    vendor: input.brand,
    productType: input.category ?? 'General',
    status: 'DRAFT', // Auto-Mirror 는 무조건 DRAFT (카탈로그 비노출)
    tags: [
      `pn-canonical:${canonicalId}`,
      `origin:${input.originCountry ?? 'KR'}`,
      input.sourceStore ? `source:${input.sourceStore}` : '',
      input.scrapeLevel ? `scrape:${input.scrapeLevel}` : '',
    ].filter(Boolean),
    metafields: [
      { namespace: 'paynship', key: 'canonical_id', value: canonicalId, type: 'single_line_text_field' },
      { namespace: 'paynship', key: 'source_url', value: input.sourceUrl, type: 'url' },
      { namespace: 'paynship', key: 'origin_country', value: input.originCountry ?? 'KR', type: 'single_line_text_field' },
      ...(input.scrapeLevel
        ? [{ namespace: 'paynship', key: 'scrape_level', value: input.scrapeLevel, type: 'single_line_text_field' }]
        : []),
      ...(input.sourceStore
        ? [{ namespace: 'paynship', key: 'source_store', value: input.sourceStore, type: 'single_line_text_field' }]
        : []),
    ],
  });

  // Variant 생성 (옵션 있으면 옵션 먼저, default variant는 productCreate 시 자동 생성됨)
  let variantId: string | undefined;
  if (input.options && input.options.length > 0) {
    // Shopify 2025-10: default variant가 자동 생성되므로 options + variant 모두 수동 추가 필요
    await createProductOptions(
      product.id,
      input.options.map(o => ({ name: o.name, values: [o.value] })),
    );

    const createdVariants = await createProductVariants(product.id, [
      {
        price: input.priceUsd.toFixed(2),
        sku: input.sku ?? canonicalId.slice(0, 12),
        options: input.options,
        inventoryQuantity: 999,
        inventoryPolicy: 'CONTINUE',
      },
    ]);
    variantId = createdVariants[0]?.id;
  }
  // Default variant 사용 시 (options 없음) — Shopify가 auto-create한 variant를 다시 조회해야 함
  // MVP: options 없으면 default variant 사용, 가격은 이미 productCreate에 반영 못 하므로 추후 update 필요
  // → 추후 마이그레이션: productSet mutation으로 원자적 create

  return {
    canonicalId,
    productId: product.id,
    handle: product.handle,
    created: true,
    variantId,
    variantCreated: !!variantId,
  };
}
