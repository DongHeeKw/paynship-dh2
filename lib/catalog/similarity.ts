/**
 * String similarity — token + n-gram 기반.
 *
 * 외부 deps 없이 작동. Catalog Pivot 의 brand+title 유사도 측정용.
 * 한국어/영어 혼재 상품명에 robust 하도록 NFKC normalize + char-bigram.
 */

function toBigrams(s: string): Set<string> {
  const padded = ` ${s} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 1; i++) {
    grams.add(padded.slice(i, i + 2));
  }
  return grams;
}

/**
 * Dice coefficient over character bigrams.
 *   2 * |A ∩ B| / (|A| + |B|)
 *
 * 빈 문자열 / 매우 짧은 문자열 처리: 두 입력이 같으면 1, 다르면 0.
 */
export function bigramSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const aGrams = toBigrams(a);
  const bGrams = toBigrams(b);
  let intersection = 0;
  for (const g of aGrams) {
    if (bGrams.has(g)) intersection++;
  }
  return (2 * intersection) / (aGrams.size + bGrams.size);
}

/**
 * 토큰 단위 Jaccard (공백 분리). 짧은 product code 매칭용.
 */
export function tokenJaccard(a: string, b: string): number {
  const aTokens = new Set(a.split(/\s+/).filter(Boolean));
  const bTokens = new Set(b.split(/\s+/).filter(Boolean));
  if (aTokens.size === 0 && bTokens.size === 0) return 1;
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  let intersection = 0;
  for (const t of aTokens) if (bTokens.has(t)) intersection++;
  const union = aTokens.size + bTokens.size - intersection;
  return intersection / union;
}

/**
 * Catalog Pivot 용 title 유사도:
 *   bigram (전체) × 0.7 + token Jaccard × 0.3
 *
 * 비율: 형태소 유사도 우선, 토큰 일치도 보완.
 */
export function titleSimilarity(a: string, b: string): number {
  const big = bigramSimilarity(a, b);
  const tok = tokenJaccard(a, b);
  return big * 0.7 + tok * 0.3;
}
