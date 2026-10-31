/**
 * Category Resolver - SSoT for Category-Based Estimations
 *
 * This module provides unified category lookup with:
 * 1. Alias-based fuzzy matching (new aliases field)
 * 2. Partial text matching
 * 3. DB-backed values with hardcoded fallback
 * 4. Both async (DB) and sync (fallback) versions
 *
 * Usage:
 * - async: `await getCategoryEstimates('k-pop album')` - uses DB
 * - sync: `estimateWeightSync('fashion')` - uses hardcoded fallback
 *
 * @module lib/business/category-resolver
 */

import type { CategoryMapping } from '@prisma/client';
import { getCategoryMappings } from './settings';
import { logger } from '@/lib/utils/logger';
// SSoT: Weight map from shipping.ts (avoid duplication)
import { CATEGORY_WEIGHT_MAP } from '@/lib/calculator/shipping';

// ============================================================================
// Types
// ============================================================================

export interface CategoryEstimates {
  /** Category key (matched or default) */
  category: string;
  /** Estimated weight in kg */
  weightKg: number;
  /** Estimated dimensions in cm */
  dimensions: { l: number; w: number; h: number };
  /** HS Code prefix (2-4 digits) */
  hsCodePrefix: string;
  /** Confidence score (1.0 = exact match, 0.8 = alias, 0.6 = partial, 0.4 = default) */
  confidence: number;
  /** Source of the estimate */
  source: 'db-exact' | 'db-alias' | 'db-partial' | 'db-default' | 'fallback';
}

interface MatchResult {
  mapping: CategoryMapping;
  matchType: 'exact' | 'alias' | 'partial';
  confidence: number;
}

// ============================================================================
// Hardcoded Fallbacks (from shipping.ts - for sync operations and DB failure)
// ============================================================================

// SSoT: Re-use weight map from shipping.ts to avoid duplication
const WEIGHT_FALLBACK = CATEGORY_WEIGHT_MAP;

const DIMENSION_FALLBACK: Record<string, { l: number; w: number; h: number }> = {
  'fashion': { l: 35, w: 25, h: 8 },
  'beauty': { l: 20, w: 15, h: 10 },
  'cosmetics': { l: 20, w: 15, h: 10 },
  'electronics': { l: 30, w: 25, h: 15 },
  'food': { l: 25, w: 20, h: 15 },
  'books': { l: 25, w: 18, h: 5 },
  'toys': { l: 30, w: 25, h: 20 },
  'home': { l: 40, w: 30, h: 20 },
  'k-pop': { l: 32, w: 26, h: 5 },
  'music': { l: 32, w: 26, h: 5 },
  'jewelry': { l: 15, w: 10, h: 5 },
  'accessories': { l: 20, w: 15, h: 8 },
  'shoes': { l: 35, w: 25, h: 15 },
  'bags': { l: 40, w: 35, h: 15 },
  'health': { l: 20, w: 15, h: 10 },
  'default': { l: 30, w: 25, h: 15 },
};

const HS_CODE_FALLBACK: Record<string, string> = {
  'fashion': '61',      // 의류 (편물)
  'beauty': '33',       // 화장품
  'cosmetics': '33',
  'electronics': '85',  // 전기기기
  'food': '21',         // 조제식품
  'snack': '19',        // 과자류
  'books': '49',        // 인쇄물
  'toys': '95',         // 완구
  'home': '94',         // 가구
  'k-pop': '85',        // CD/앨범 (광학매체)
  'music': '85',
  'jewelry': '71',      // 귀금속
  'accessories': '42',  // 가죽제품
  'shoes': '64',        // 신발류
  'bags': '42',         // 가방
  'health': '21',       // 건강보조식품
  'default': '99',      // 기타
};

// ============================================================================
// Category Matching Logic (with alias support)
// ============================================================================

/**
 * Find best matching category from mappings
 * Priority: exact match > alias match > partial match
 */
function findBestMatch(category: string, mappings: CategoryMapping[]): MatchResult | null {
  const normalized = category.toLowerCase().trim();

  // 1. Exact match on category name
  const exactMatch = mappings.find(m => m.category.toLowerCase() === normalized);
  if (exactMatch) {
    return { mapping: exactMatch, matchType: 'exact', confidence: 1.0 };
  }

  // 2. Alias match (new feature)
  for (const mapping of mappings) {
    const aliases = (mapping.aliases || []) as string[];
    const aliasMatch = aliases.some(alias =>
      alias.toLowerCase() === normalized ||
      normalized.includes(alias.toLowerCase()) ||
      alias.toLowerCase().includes(normalized)
    );
    if (aliasMatch) {
      return { mapping, matchType: 'alias', confidence: 0.85 };
    }
  }

  // 3. Partial match on category name
  for (const mapping of mappings) {
    if (normalized.includes(mapping.category.toLowerCase()) ||
        mapping.category.toLowerCase().includes(normalized)) {
      return { mapping, matchType: 'partial', confidence: 0.7 };
    }
  }

  return null;
}

/**
 * Find matching category from fallback tables (sync)
 * Used when DB is unavailable
 */
function findFallbackMatch(category: string): {
  key: string;
  confidence: number;
} {
  const normalized = category.toLowerCase().trim();

  // Exact match
  if (WEIGHT_FALLBACK[normalized]) {
    return { key: normalized, confidence: 0.9 };
  }

  // Partial match
  for (const key of Object.keys(WEIGHT_FALLBACK)) {
    if (key === 'default') continue;
    if (normalized.includes(key) || key.includes(normalized)) {
      return { key, confidence: 0.65 };
    }
  }

  return { key: 'default', confidence: 0.4 };
}

// ============================================================================
// Async Resolvers (DB-backed)
// ============================================================================

/**
 * Get comprehensive category estimates from DB
 * Uses alias matching for better coverage
 *
 * @param category - Category string (can be exact or fuzzy)
 * @returns CategoryEstimates with confidence score
 */
export async function getCategoryEstimates(category?: string): Promise<CategoryEstimates> {
  if (!category) {
    return getDefaultEstimates('fallback');
  }

  try {
    const mappings = await getCategoryMappings();

    const match = findBestMatch(category, mappings);

    if (match) {
      return {
        category: match.mapping.category,
        weightKg: match.mapping.estimatedWeightKg,
        dimensions: {
          l: match.mapping.dimensionL,
          w: match.mapping.dimensionW,
          h: match.mapping.dimensionH,
        },
        hsCodePrefix: match.mapping.hsCodePrefix,
        confidence: match.confidence,
        source: `db-${match.matchType}` as CategoryEstimates['source'],
      };
    }

    // Fall back to 'other' category in DB
    const otherMapping = mappings.find(m => m.category === 'other');
    if (otherMapping) {
      return {
        category: 'other',
        weightKg: otherMapping.estimatedWeightKg,
        dimensions: {
          l: otherMapping.dimensionL,
          w: otherMapping.dimensionW,
          h: otherMapping.dimensionH,
        },
        hsCodePrefix: otherMapping.hsCodePrefix,
        confidence: 0.4,
        source: 'db-default',
      };
    }

    // DB has no 'other' category, use hardcoded fallback
    return getDefaultEstimates('fallback');
  } catch (error) {
    logger.warn('CategoryResolver', `DB lookup failed, using fallback: ${error}`);
    return getCategoryEstimatesSync(category);
  }
}

/**
 * Get estimated weight by category (async, DB-backed)
 */
export async function getEstimatedWeight(category?: string): Promise<number> {
  const estimates = await getCategoryEstimates(category);
  return estimates.weightKg;
}

/**
 * Get estimated dimensions by category (async, DB-backed)
 */
export async function getEstimatedDimensions(category?: string): Promise<{ l: number; w: number; h: number }> {
  const estimates = await getCategoryEstimates(category);
  return estimates.dimensions;
}

/**
 * Get HS code prefix by category (async, DB-backed)
 */
export async function getHsCodePrefix(category?: string): Promise<string> {
  const estimates = await getCategoryEstimates(category);
  return estimates.hsCodePrefix;
}

// ============================================================================
// Sync Resolvers (Hardcoded Fallback)
// ============================================================================

function getDefaultEstimates(source: CategoryEstimates['source']): CategoryEstimates {
  return {
    category: 'default',
    weightKg: WEIGHT_FALLBACK.default,
    dimensions: DIMENSION_FALLBACK.default,
    hsCodePrefix: HS_CODE_FALLBACK.default,
    confidence: 0.4,
    source,
  };
}

/**
 * Get category estimates synchronously (uses hardcoded fallback)
 * Use when DB access is not possible (e.g., in sync contexts)
 *
 * @param category - Category string
 * @returns CategoryEstimates from hardcoded fallback
 */
export function getCategoryEstimatesSync(category?: string): CategoryEstimates {
  if (!category) {
    return getDefaultEstimates('fallback');
  }

  const { key, confidence } = findFallbackMatch(category);

  return {
    category: key,
    weightKg: WEIGHT_FALLBACK[key] ?? WEIGHT_FALLBACK.default,
    dimensions: DIMENSION_FALLBACK[key] ?? DIMENSION_FALLBACK.default,
    hsCodePrefix: HS_CODE_FALLBACK[key] ?? HS_CODE_FALLBACK.default,
    confidence,
    source: 'fallback',
  };
}

/**
 * Get estimated weight synchronously (hardcoded fallback)
 * @deprecated Use getEstimatedWeight for production code
 */
export function estimateWeightSync(category?: string): number {
  const estimates = getCategoryEstimatesSync(category);
  return estimates.weightKg;
}

/**
 * Get estimated dimensions synchronously (hardcoded fallback)
 * @deprecated Use getEstimatedDimensions for production code
 */
export function estimateDimensionsSync(category?: string): { l: number; w: number; h: number } {
  const estimates = getCategoryEstimatesSync(category);
  return estimates.dimensions;
}

/**
 * Get HS code prefix synchronously (hardcoded fallback)
 * @deprecated Use getHsCodePrefix for production code
 */
export function getHsCodePrefixSync(category?: string): string {
  const estimates = getCategoryEstimatesSync(category);
  return estimates.hsCodePrefix;
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Get estimates for multiple categories at once
 * Efficient for batch processing (single DB call)
 */
export async function getCategoryEstimatesBatch(
  categories: string[]
): Promise<Map<string, CategoryEstimates>> {
  const results = new Map<string, CategoryEstimates>();

  try {
    const mappings = await getCategoryMappings();

    for (const category of categories) {
      if (!category) {
        results.set(category, getDefaultEstimates('fallback'));
        continue;
      }

      const match = findBestMatch(category, mappings);
      if (match) {
        results.set(category, {
          category: match.mapping.category,
          weightKg: match.mapping.estimatedWeightKg,
          dimensions: {
            l: match.mapping.dimensionL,
            w: match.mapping.dimensionW,
            h: match.mapping.dimensionH,
          },
          hsCodePrefix: match.mapping.hsCodePrefix,
          confidence: match.confidence,
          source: `db-${match.matchType}` as CategoryEstimates['source'],
        });
      } else {
        results.set(category, getCategoryEstimatesSync(category));
      }
    }
  } catch (error) {
    logger.warn('CategoryResolver', `Batch lookup failed, using fallbacks: ${error}`);
    for (const category of categories) {
      results.set(category, getCategoryEstimatesSync(category));
    }
  }

  return results;
}
