/**
 * Catalog Matching Engine — orchestrator.
 *
 * 단일 진입점 `matchOrCreateCatalogEntry(productId)` 호출 시:
 *   1. Product 조회 (sourceUrlHash, sku, brand, name, category)
 *   2. findCatalogMatch() → tier/action 결정
 *   3. AUTO_MATCH → CatalogMatch 생성 + Product.catalogEntryId 갱신
 *      MANUAL_QUEUE → CatalogMatch (matchType=MANUAL 대기) 생성, Product 갱신 보류
 *      CREATE_NEW → 신규 CatalogEntry + Product 연결
 *
 * 멱등성: 같은 productId 재호출 시 기존 매칭 그대로 반환.
 */

import { prisma } from '@/lib/db/prisma';
import { normalizeBrand } from '@/lib/mirror/brand-alias';
import { computeCanonicalId } from '@/lib/mirror/canonical-id';
import { findCatalogMatch, PivotResult, PivotAction } from './pivot-tier';

export interface CatalogMatchOutcome {
  productId: string;
  action: PivotAction | 'ALREADY_MATCHED';
  catalogEntryId: string;
  tier: PivotResult['tier'];
  confidence: number;
  reason: string;
  isNew: boolean;
}

export async function matchOrCreateCatalogEntry(productId: string): Promise<CatalogMatchOutcome> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      brand: true,
      name: true,
      sku: true,
      category: true,
      sourceUrl: true,
      sourceUrlHash: true,
      catalogEntryId: true,
      origin: true,
      priceKrw: true,
    },
  });
  if (!product) throw new Error(`Product ${productId} not found`);

  // 이미 매칭됨 → idempotent return
  if (product.catalogEntryId) {
    return {
      productId,
      action: 'ALREADY_MATCHED',
      catalogEntryId: product.catalogEntryId,
      tier: null,
      confidence: 1,
      reason: 'Product already linked to CatalogEntry',
      isNew: false,
    };
  }

  const pivot = await findCatalogMatch({
    brand: product.brand,
    productName: product.name,
    sku: product.sku,
    category: product.category,
    sourceUrlHash: product.sourceUrlHash,
    excludeProductId: product.id,
  });

  if (pivot.action === 'AUTO_MATCH' && pivot.catalogEntryId) {
    await applyAutoMatch(product.id, { ...pivot, catalogEntryId: pivot.catalogEntryId });
    return {
      productId,
      action: 'AUTO_MATCH',
      catalogEntryId: pivot.catalogEntryId,
      tier: pivot.tier,
      confidence: pivot.confidence,
      reason: pivot.reason,
      isNew: false,
    };
  }

  if (pivot.action === 'MANUAL_QUEUE' && pivot.catalogEntryId) {
    await queueForManualReview(product.id, { ...pivot, catalogEntryId: pivot.catalogEntryId });
    return {
      productId,
      action: 'MANUAL_QUEUE',
      catalogEntryId: pivot.catalogEntryId,
      tier: pivot.tier,
      confidence: pivot.confidence,
      reason: pivot.reason,
      isNew: false,
    };
  }

  // CREATE_NEW
  const newEntry = await createCatalogEntryFor(product);
  return {
    productId,
    action: 'CREATE_NEW',
    catalogEntryId: newEntry.id,
    tier: null,
    confidence: 1,
    reason: 'No match — new CatalogEntry created',
    isNew: true,
  };
}

/**
 * AUTO_MATCH 적용 — CatalogMatch upsert + Product.catalogEntryId 갱신.
 */
async function applyAutoMatch(
  productId: string,
  pivot: PivotResult & { catalogEntryId: string },
): Promise<void> {
  const matchType = pivot.tier === 1 ? 'AUTO_EXACT' : 'AUTO_FUZZY';

  await prisma.$transaction(async (tx) => {
    await tx.catalogMatch.upsert({
      where: {
        catalogEntryId_productId: {
          catalogEntryId: pivot.catalogEntryId,
          productId,
        },
      },
      create: {
        catalogEntryId: pivot.catalogEntryId,
        productId,
        matchType,
        confidence: pivot.confidence,
      },
      update: {
        matchType,
        confidence: pivot.confidence,
        matchedAt: new Date(),
      },
    });
    await tx.product.update({
      where: { id: productId },
      data: { catalogEntryId: pivot.catalogEntryId },
    });
  });
}

/**
 * MANUAL_QUEUE — CatalogMatch (matchType=MANUAL) row 만 생성. Product 연결은 운영자 승인 후.
 * 같은 (entryId, productId) 가 이미 있으면 confidence 만 업데이트.
 */
async function queueForManualReview(
  productId: string,
  pivot: PivotResult & { catalogEntryId: string },
): Promise<void> {
  await prisma.catalogMatch.upsert({
    where: {
      catalogEntryId_productId: {
        catalogEntryId: pivot.catalogEntryId,
        productId,
      },
    },
    create: {
      catalogEntryId: pivot.catalogEntryId,
      productId,
      matchType: 'MANUAL',
      confidence: pivot.confidence,
    },
    update: {
      confidence: pivot.confidence,
      matchedAt: new Date(),
    },
  });
}

async function createCatalogEntryFor(product: {
  id: string;
  brand: string | null;
  name: string;
  sku: string | null;
  category: string | null;
  sourceUrl: string;
  origin: string | null;
  priceKrw: number;
}): Promise<{ id: string }> {
  const brandKey = normalizeBrand(product.brand) || 'unknown';
  const canonicalId = computeCanonicalId({
    title: product.name,
    brand: product.brand,
    sourceUrl: product.sourceUrl,
    originCountry: product.origin ?? 'KR',
    category: product.category,
  });

  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.catalogEntry.create({
      data: {
        catalogId: canonicalId,
        brand: brandKey,
        productName: product.name,
        sku: product.sku ?? null,
        primaryUrl: product.sourceUrl,
        primaryProductId: product.id,
        category: product.category ?? null,
        lowestPriceKrw: Math.round(product.priceKrw),
        lowestPriceScanAt: new Date(),
        confidence: 1.0,
      },
    });
    await tx.catalogMatch.create({
      data: {
        catalogEntryId: entry.id,
        productId: product.id,
        matchType: 'AUTO_EXACT',
        confidence: 1.0,
      },
    });
    await tx.product.update({
      where: { id: product.id },
      data: { catalogEntryId: entry.id },
    });
    return entry;
  });

  return { id: created.id };
}
