/**
 * Material-HS Mapper
 *
 * Refines HS Code classification using material/fabric composition
 * Material is a key factor in HS Code determination, especially for:
 * - Textiles (Chapter 50-63)
 * - Footwear (Chapter 64)
 * - Jewelry (Chapter 71)
 *
 * @module lib/classifier/material-hs-mapper
 */

// ============================================================================
// Types
// ============================================================================

export interface MaterialHSMapping {
  material: string;
  categoryHint?: string;
  hsCodeRefinement: string;
  confidence: number;
  description: string;
}

export interface MaterialRefinementResult {
  hsCode: string;
  confidence: number;
  reasoning: string;
  materialDetected?: string;
}

// ============================================================================
// Material Mapping Tables
// ============================================================================

const TEXTILE_MATERIALS: MaterialHSMapping[] = [
  { material: 'cotton', hsCodeRefinement: '6109.10', confidence: 0.85, description: 'Cotton T-shirts' },
  { material: '면', hsCodeRefinement: '6109.10', confidence: 0.85, description: '면 티셔츠' },
  { material: 'polyester', hsCodeRefinement: '6109.90', confidence: 0.80, description: 'Synthetic T-shirts' },
  { material: '폴리에스터', hsCodeRefinement: '6109.90', confidence: 0.80, description: '합성섬유 티셔츠' },
  { material: 'wool', hsCodeRefinement: '6110.11', confidence: 0.85, description: 'Wool sweaters' },
  { material: '울', hsCodeRefinement: '6110.11', confidence: 0.85, description: '울 스웨터' },
  { material: 'cashmere', hsCodeRefinement: '6110.12', confidence: 0.90, description: 'Cashmere sweaters' },
  { material: '캐시미어', hsCodeRefinement: '6110.12', confidence: 0.90, description: '캐시미어 스웨터' },
  { material: 'silk', hsCodeRefinement: '6206.10', confidence: 0.85, description: 'Silk blouses' },
  { material: '실크', hsCodeRefinement: '6206.10', confidence: 0.85, description: '실크 블라우스' },
  { material: 'linen', hsCodeRefinement: '6206.40', confidence: 0.80, description: 'Linen garments' },
  { material: '린넨', hsCodeRefinement: '6206.40', confidence: 0.80, description: '린넨 의류' },
  { material: 'denim', hsCodeRefinement: '6203.42', confidence: 0.85, description: 'Denim trousers' },
  { material: '데님', hsCodeRefinement: '6203.42', confidence: 0.85, description: '데님 바지' },
  { material: 'leather', hsCodeRefinement: '4203.10', confidence: 0.90, description: 'Leather clothing' },
  { material: '가죽', hsCodeRefinement: '4203.10', confidence: 0.90, description: '가죽 의류' },
];

const FOOTWEAR_MATERIALS: MaterialHSMapping[] = [
  { material: 'leather', categoryHint: 'shoes', hsCodeRefinement: '6403', confidence: 0.85, description: 'Leather footwear' },
  { material: '가죽', categoryHint: 'shoes', hsCodeRefinement: '6403', confidence: 0.85, description: '가죽 신발' },
  { material: 'rubber', categoryHint: 'shoes', hsCodeRefinement: '6401', confidence: 0.85, description: 'Rubber footwear' },
  { material: 'textile', categoryHint: 'shoes', hsCodeRefinement: '6404', confidence: 0.80, description: 'Textile footwear' },
  { material: 'canvas', categoryHint: 'shoes', hsCodeRefinement: '6404', confidence: 0.80, description: 'Canvas footwear' },
];

const BAG_MATERIALS: MaterialHSMapping[] = [
  { material: 'leather', categoryHint: 'bags', hsCodeRefinement: '4202.21', confidence: 0.85, description: 'Leather handbags' },
  { material: '가죽', categoryHint: 'bags', hsCodeRefinement: '4202.21', confidence: 0.85, description: '가죽 핸드백' },
  { material: 'textile', categoryHint: 'bags', hsCodeRefinement: '4202.22', confidence: 0.80, description: 'Textile handbags' },
  { material: 'canvas', categoryHint: 'bags', hsCodeRefinement: '4202.92', confidence: 0.80, description: 'Canvas bags' },
  { material: 'nylon', categoryHint: 'bags', hsCodeRefinement: '4202.92', confidence: 0.80, description: 'Nylon bags' },
];

const JEWELRY_MATERIALS: MaterialHSMapping[] = [
  { material: 'gold', categoryHint: 'jewelry', hsCodeRefinement: '7113.19', confidence: 0.90, description: 'Gold jewelry' },
  { material: '금', categoryHint: 'jewelry', hsCodeRefinement: '7113.19', confidence: 0.90, description: '금 주얼리' },
  { material: 'silver', categoryHint: 'jewelry', hsCodeRefinement: '7113.11', confidence: 0.90, description: 'Silver jewelry' },
  { material: '은', categoryHint: 'jewelry', hsCodeRefinement: '7113.11', confidence: 0.90, description: '은 주얼리' },
  { material: 'imitation', categoryHint: 'jewelry', hsCodeRefinement: '7117', confidence: 0.85, description: 'Imitation jewelry' },
];

const ALL_MAPPINGS: MaterialHSMapping[] = [
  ...TEXTILE_MATERIALS,
  ...FOOTWEAR_MATERIALS,
  ...BAG_MATERIALS,
  ...JEWELRY_MATERIALS,
];

// ============================================================================
// Material Detection
// ============================================================================

export function extractMaterialComposition(text: string): Array<{ material: string; percentage?: number }> {
  const results: Array<{ material: string; percentage?: number }> = [];
  const normalizedText = text.toLowerCase();

  const percentPatterns = [
    /(\w+)\s*(\d+(?:\.\d+)?)\s*%/gi,
    /(\d+(?:\.\d+)?)\s*%\s*(\w+)/gi,
  ];

  for (const pattern of percentPatterns) {
    let match;
    while ((match = pattern.exec(normalizedText)) !== null) {
      const [, first, second] = match;
      const isFirstNumber = /^\d/.test(first);
      const material = isFirstNumber ? second : first;
      const percentage = parseFloat(isFirstNumber ? first : second);

      if (material.length > 2 && percentage > 0 && percentage <= 100) {
        results.push({ material, percentage });
      }
    }
  }

  if (results.length === 0) {
    const materialKeywords = [
      'cotton', 'polyester', 'wool', 'silk', 'linen', 'cashmere', 'leather',
      'nylon', 'spandex', 'denim', 'canvas', 'rubber', 'gold', 'silver',
      '면', '폴리에스터', '울', '실크', '린넨', '캐시미어', '가죽',
    ];

    for (const keyword of materialKeywords) {
      if (normalizedText.includes(keyword)) {
        results.push({ material: keyword });
      }
    }
  }

  return results;
}

export function getDominantMaterial(composition: Array<{ material: string; percentage?: number }>): string | null {
  if (composition.length === 0) return null;

  const withPercentage = composition.filter(c => c.percentage !== undefined);
  if (withPercentage.length > 0) {
    withPercentage.sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
    return withPercentage[0].material;
  }

  return composition[0].material;
}

// ============================================================================
// HS Code Refinement
// ============================================================================

export function refineHSCodeByMaterial(
  baseHsCode: string,
  material: string | null,
  category?: string
): MaterialRefinementResult {
  if (!material) {
    return {
      hsCode: baseHsCode,
      confidence: 0.5,
      reasoning: 'No material information provided',
    };
  }

  const composition = extractMaterialComposition(material);
  const dominantMaterial = getDominantMaterial(composition);

  if (!dominantMaterial) {
    return {
      hsCode: baseHsCode,
      confidence: 0.5,
      reasoning: `Could not parse material from: ${material.substring(0, 50)}`,
    };
  }

  const normalizedMaterial = dominantMaterial.toLowerCase();
  const normalizedCategory = category?.toLowerCase();

  let bestMatch: MaterialHSMapping | null = null;

  for (const mapping of ALL_MAPPINGS) {
    if (!mapping.material.toLowerCase().includes(normalizedMaterial) &&
        !normalizedMaterial.includes(mapping.material.toLowerCase())) {
      continue;
    }

    if (mapping.categoryHint && normalizedCategory) {
      if (!normalizedCategory.includes(mapping.categoryHint) &&
          !mapping.categoryHint.includes(normalizedCategory)) {
        continue;
      }
    }

    if (!bestMatch || mapping.confidence > bestMatch.confidence) {
      bestMatch = mapping;
    }
  }

  if (bestMatch) {
    return {
      hsCode: bestMatch.hsCodeRefinement,
      confidence: bestMatch.confidence,
      reasoning: `Material "${dominantMaterial}" maps to ${bestMatch.description}`,
      materialDetected: dominantMaterial,
    };
  }

  return {
    hsCode: baseHsCode,
    confidence: 0.6,
    reasoning: `Material "${dominantMaterial}" not in mapping table`,
    materialDetected: dominantMaterial,
  };
}

export function isMaterialRelevantForCategory(category: string): boolean {
  const materialSensitiveCategories = [
    'fashion', 'clothing', 'apparel', 'textile',
    'shoes', 'footwear',
    'bags', 'handbags', 'luggage',
    'jewelry', 'accessories',
  ];

  const normalizedCategory = category.toLowerCase();
  return materialSensitiveCategories.some(c =>
    normalizedCategory.includes(c) || c.includes(normalizedCategory)
  );
}
