/**
 * PayNShip v2.1 — Brand Alias 매핑
 *
 * 같은 브랜드를 다양하게 표기하는 것을 정규화.
 * MVP: 파일 기반 상수. Scale 시 Prisma 테이블로 이관 예정.
 */

// Key: canonical lowercase, Value: 동의어 배열 (lowercase)
const BRAND_ALIAS_GROUPS: Record<string, string[]> = {
  // K-pop
  ive:       ['아이브', 'ive', '아이브스타'],
  starship:  ['starship', '스타쉽', '스타쉽엔터', 'starshipent', 'starship entertainment'],
  hybe:      ['hybe', '하이브', 'hybe labels'],
  bighit:    ['bighit', '빅히트', 'bighit music'],
  sm:        ['sm', '에스엠', 'smtown', 'sm entertainment', 'sment'],
  jyp:       ['jyp', '제이와이피', 'jyp entertainment'],
  yg:        ['yg', '와이지', 'yg entertainment'],
  bt21:      ['bt21'],
  kakaofriends: ['kakaofriends', '카카오프렌즈', 'kakao friends'],

  // K-fashion
  musinsa:   ['musinsa', '무신사'],
  // K-beauty
  amorepacific: ['amorepacific', '아모레퍼시픽', '아모레', 'amore'],
  innisfree: ['innisfree', '이니스프리'],
  thefaceshop: ['thefaceshop', '더페이스샵', 'face shop'],
  laneige:   ['laneige', '라네즈'],

  // Sports / Athletics
  nike:      ['nike', '나이키'],
  adidas:    ['adidas', '아디다스'],
  newbalance: ['newbalance', '뉴발란스', 'new balance', 'nb'],
  puma:      ['puma', '푸마'],

  // Games / Anime
  pokemon:   ['pokemon', '포켓몬', 'pokémon'],
  sanrio:    ['sanrio', '산리오'],
};

/** Lowercase variant → canonical brand key */
const ALIAS_TO_CANONICAL: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(BRAND_ALIAS_GROUPS)) {
    map[canonical] = canonical;
    for (const a of aliases) {
      map[normalize(a)] = canonical;
    }
  }
  return map;
})();

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '').replace(/[.,\-_]/g, '');
}

/**
 * 브랜드 이름 → canonical key
 * 매칭 실패 시 normalized 형태 반환 (unknown brand).
 */
export function normalizeBrand(brand: string | null | undefined): string {
  if (!brand) return '';
  const key = normalize(brand);
  return ALIAS_TO_CANONICAL[key] ?? key;
}

/**
 * 디버그용: 현재 등록된 브랜드 개수
 */
export function getBrandAliasStats(): { groups: number; totalAliases: number } {
  return {
    groups: Object.keys(BRAND_ALIAS_GROUPS).length,
    totalAliases: Object.keys(ALIAS_TO_CANONICAL).length,
  };
}
