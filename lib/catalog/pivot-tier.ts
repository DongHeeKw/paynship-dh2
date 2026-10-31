/**
 * Catalog Matching Engine — 4-tier Pivot Search (v2.0 ADR)
 *
 * Flow:
 *   T0 (Exact URL)        — Product.sourceUrlHash 일치 → 기존 CatalogMatch 재사용
 *   T1 (SKU + Brand)      — Product.sku + normalizeBrand 일치, confidence = 1.0
 *   T2 (Brand + Title)    — bigram+token 유사도 ≥ 0.85, auto-match
 *   T3 (Brand + Category) — 유사도 0.60-0.84, manual queue
 *   miss                  — 신규 CatalogEntry 생성
 *
 * Threshold 정책 (v2.0):
 *   AUTO_MATCH_THRESHOLD = 0.85
 *   MANUAL_QUEUE_THRESHOLD = 0.60
 */

import { prisma } from '@/lib/db/prisma';
import { normalizeBrand } from '@/lib/mirror/brand-alias';
import { normalizeTitle } from '@/lib/mirror/canonical-id';
import { titleSimilarity } from './similarity';

export const AUTO_MATCH_THRESHOLD = 0.85;
export const MANUAL_QUEUE_THRESHOLD = 0.6;

export type PivotTier = 0 | 1 | 2 | 3;
export type PivotAction = 'AUTO_MATCH' | 'MANUAL_QUEUE' | 'CREATE_NEW';

export interface PivotInput {
  brand: string | null | undefined;
  productName: string;
  sku?: string | null;
  category?: string | null;
  /** Product.sourceUrlHash — T0 검사용 */
  sourceUrlHash?: string | null;
  /** 현재 매칭하려는 Product.id (T0에서 자기 자신 제외용) */
  excludeProductId?: string;
}

export interface PivotResult {
  tier: PivotTier | null;
  action: PivotAction;
  catalogEntryId: string | null;
  confidence: number;
  reason: string;
}

/**
 * 4-tier Pivot 실행.
 *   - T0~T2 hit → AUTO_MATCH
 *   - T3 hit → MANUAL_QUEUE
 *   - miss → CREATE_NEW (catalogEntryId=null)
 */
export async function findCatalogMatch(input: PivotInput): Promise<PivotResult> {
  const brandKey = normalizeBrand(input.brand);
  const titleNorm = normalizeTitle(input.productName);

  // ─── T0: 기존 Product (sourceUrlHash) 의 매칭 재사용 ────────────────────────
  if (input.sourceUrlHash) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        sourceUrlHash: input.sourceUrlHash,
        catalogEntryId: { not: null },
        ...(input.excludeProductId ? { id: { not: input.excludeProductId } } : {}),
      },
      select: { catalogEntryId: true },
    });
    if (existingProduct?.catalogEntryId) {
      return {
        tier: 0,
        action: 'AUTO_MATCH',
        catalogEntryId: existingProduct.catalogEntryId,
        confidence: 1.0,
        reason: 'T0 — Exact sourceUrlHash hit',
      };
    }
  }

  // ─── T1: SKU + Brand exact ─────────────────────────────────────────────────
  if (input.sku && brandKey) {
    const t1 = await prisma.catalogEntry.findFirst({
      where: {
        sku: input.sku,
        brand: { equals: brandKey, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (t1) {
      return {
        tier: 1,
        action: 'AUTO_MATCH',
        catalogEntryId: t1.id,
        confidence: 1.0,
        reason: `T1 — SKU exact (${input.sku}) + brand match (${brandKey})`,
      };
    }
  }

  // ─── T2: Brand + Title similarity ≥ 0.85 ────────────────────────────────────
  if (brandKey) {
    const candidates = await prisma.catalogEntry.findMany({
      where: { brand: { equals: brandKey, mode: 'insensitive' } },
      select: { id: true, productName: true, category: true },
      take: 200,
    });
    let best: { id: string; score: number; name: string } | null = null;
    for (const c of candidates) {
      const candTitle = normalizeTitle(c.productName);
      const score = titleSimilarity(titleNorm, candTitle);
      if (!best || score > best.score) {
        best = { id: c.id, score, name: c.productName };
      }
    }
    if (best && best.score >= AUTO_MATCH_THRESHOLD) {
      return {
        tier: 2,
        action: 'AUTO_MATCH',
        catalogEntryId: best.id,
        confidence: best.score,
        reason: `T2 — Brand+Title sim=${best.score.toFixed(2)} (vs "${best.name}")`,
      };
    }
    if (best && best.score >= MANUAL_QUEUE_THRESHOLD) {
      return {
        tier: 3,
        action: 'MANUAL_QUEUE',
        catalogEntryId: best.id,
        confidence: best.score,
        reason: `T3 — Brand+Title sim=${best.score.toFixed(2)} (queue, vs "${best.name}")`,
      };
    }
  }

  // ─── T3: Category-broad search (brand 없거나 sim 낮음) — manual queue ────────
  if (input.category && titleNorm.length >= 3) {
    const catNorm = normalizeTitle(input.category);
    const broadCandidates = await prisma.catalogEntry.findMany({
      where: {
        category: { not: null },
        unmatched: false,
      },
      select: { id: true, productName: true, category: true },
      take: 100,
    });
    let bestT3: { id: string; score: number } | null = null;
    for (const c of broadCandidates) {
      if (!c.category) continue;
      const candCat = normalizeTitle(c.category);
      if (candCat !== catNorm) continue;
      const score = titleSimilarity(titleNorm, normalizeTitle(c.productName));
      if (!bestT3 || score > bestT3.score) {
        bestT3 = { id: c.id, score };
      }
    }
    if (bestT3 && bestT3.score >= MANUAL_QUEUE_THRESHOLD) {
      return {
        tier: 3,
        action: 'MANUAL_QUEUE',
        catalogEntryId: bestT3.id,
        confidence: bestT3.score,
        reason: `T3 — Category+Title sim=${bestT3.score.toFixed(2)}`,
      };
    }
  }

  // ─── Miss → 신규 CatalogEntry 생성 ─────────────────────────────────────────
  return {
    tier: null,
    action: 'CREATE_NEW',
    catalogEntryId: null,
    confidence: 0,
    reason: 'No T0-T3 match — new CatalogEntry required',
  };
}
