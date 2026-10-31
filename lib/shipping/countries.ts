/**
 * PayNShip v2.1 — AcrossB 지원 52개국 (client-safe)
 *
 * 원본: scripts/shopify-markets/countries.ts (스크립트용).
 * 이 파일은 런타임 (클라이언트/서버) 공용 데이터.
 *
 * 참고:
 *  - '중국 남부' = CN 동일 (AcrossB 내부 라우팅)
 *  - '괌(GU)' = Shopify 미지원 → 제외
 *  → 52개 유니크 ISO 코드
 */

export interface CountryEntry {
  ko: string;
  en: string;
  iso: string;
  currency: string;
  region: 'APAC' | 'EUROPE' | 'AMERICAS' | 'MEA';
  priority: number;
}

export const COUNTRIES: CountryEntry[] = [
  // APAC (14)
  { ko: '대만',         en: 'Taiwan',       iso: 'TW', currency: 'TWD', region: 'APAC',    priority: 10 },
  { ko: '말레이시아',   en: 'Malaysia',     iso: 'MY', currency: 'MYR', region: 'APAC',    priority: 15 },
  { ko: '베트남',       en: 'Vietnam',      iso: 'VN', currency: 'VND', region: 'APAC',    priority: 15 },
  { ko: '싱가폴',       en: 'Singapore',    iso: 'SG', currency: 'SGD', region: 'APAC',    priority: 8  },
  { ko: '인도',         en: 'India',        iso: 'IN', currency: 'INR', region: 'APAC',    priority: 20 },
  { ko: '인도네시아',   en: 'Indonesia',    iso: 'ID', currency: 'IDR', region: 'APAC',    priority: 20 },
  { ko: '일본',         en: 'Japan',        iso: 'JP', currency: 'JPY', region: 'APAC',    priority: 2  },
  { ko: '중국',         en: 'China',        iso: 'CN', currency: 'CNY', region: 'APAC',    priority: 3  },
  { ko: '태국',         en: 'Thailand',     iso: 'TH', currency: 'THB', region: 'APAC',    priority: 12 },
  { ko: '필리핀',       en: 'Philippines',  iso: 'PH', currency: 'PHP', region: 'APAC',    priority: 20 },
  { ko: '호주',         en: 'Australia',    iso: 'AU', currency: 'AUD', region: 'APAC',    priority: 5  },
  { ko: '홍콩',         en: 'Hong Kong',    iso: 'HK', currency: 'HKD', region: 'APAC',    priority: 6  },
  { ko: '뉴질랜드',     en: 'New Zealand',  iso: 'NZ', currency: 'NZD', region: 'APAC',    priority: 15 },
  // EUROPE (25)
  { ko: '그리스',       en: 'Greece',       iso: 'GR', currency: 'EUR', region: 'EUROPE',  priority: 40 },
  { ko: '그린랜드',     en: 'Greenland',    iso: 'GL', currency: 'DKK', region: 'EUROPE',  priority: 80 },
  { ko: '네덜란드',     en: 'Netherlands',  iso: 'NL', currency: 'EUR', region: 'EUROPE',  priority: 15 },
  { ko: '노르웨이',     en: 'Norway',       iso: 'NO', currency: 'NOK', region: 'EUROPE',  priority: 25 },
  { ko: '독일',         en: 'Germany',      iso: 'DE', currency: 'EUR', region: 'EUROPE',  priority: 7  },
  { ko: '리투아니아',   en: 'Lithuania',    iso: 'LT', currency: 'EUR', region: 'EUROPE',  priority: 50 },
  { ko: '러시아',       en: 'Russia',       iso: 'RU', currency: 'RUB', region: 'EUROPE',  priority: 30 },
  { ko: '룩셈부르크',   en: 'Luxembourg',   iso: 'LU', currency: 'EUR', region: 'EUROPE',  priority: 60 },
  { ko: '벨기에',       en: 'Belgium',      iso: 'BE', currency: 'EUR', region: 'EUROPE',  priority: 30 },
  { ko: '스웨덴',       en: 'Sweden',       iso: 'SE', currency: 'SEK', region: 'EUROPE',  priority: 25 },
  { ko: '스위스',       en: 'Switzerland',  iso: 'CH', currency: 'CHF', region: 'EUROPE',  priority: 20 },
  { ko: '스페인',       en: 'Spain',        iso: 'ES', currency: 'EUR', region: 'EUROPE',  priority: 20 },
  { ko: '아일랜드',     en: 'Ireland',      iso: 'IE', currency: 'EUR', region: 'EUROPE',  priority: 35 },
  { ko: '에스토니아',   en: 'Estonia',      iso: 'EE', currency: 'EUR', region: 'EUROPE',  priority: 60 },
  { ko: '영국',         en: 'United Kingdom', iso: 'GB', currency: 'GBP', region: 'EUROPE',priority: 5  },
  { ko: '오스트리아',   en: 'Austria',      iso: 'AT', currency: 'EUR', region: 'EUROPE',  priority: 30 },
  { ko: '이탈리아',     en: 'Italy',        iso: 'IT', currency: 'EUR', region: 'EUROPE',  priority: 12 },
  { ko: '체코',         en: 'Czech Republic', iso: 'CZ', currency: 'CZK', region: 'EUROPE',priority: 40 },
  { ko: '포르투갈',     en: 'Portugal',     iso: 'PT', currency: 'EUR', region: 'EUROPE',  priority: 40 },
  { ko: '폴란드',       en: 'Poland',       iso: 'PL', currency: 'PLN', region: 'EUROPE',  priority: 25 },
  { ko: '프랑스',       en: 'France',       iso: 'FR', currency: 'EUR', region: 'EUROPE',  priority: 10 },
  { ko: '핀란드',       en: 'Finland',      iso: 'FI', currency: 'EUR', region: 'EUROPE',  priority: 40 },
  { ko: '헝가리',       en: 'Hungary',      iso: 'HU', currency: 'HUF', region: 'EUROPE',  priority: 45 },
  { ko: '크로아티아',   en: 'Croatia',      iso: 'HR', currency: 'EUR', region: 'EUROPE',  priority: 50 },
  { ko: '덴마크',       en: 'Denmark',      iso: 'DK', currency: 'DKK', region: 'EUROPE',  priority: 30 },
  // AMERICAS (6)
  { ko: '미국',         en: 'United States', iso: 'US', currency: 'USD', region: 'AMERICAS', priority: 1  },
  { ko: '캐나다',       en: 'Canada',       iso: 'CA', currency: 'CAD', region: 'AMERICAS', priority: 4  },
  { ko: '멕시코',       en: 'Mexico',       iso: 'MX', currency: 'MXN', region: 'AMERICAS', priority: 25 },
  { ko: '아르헨티나',   en: 'Argentina',    iso: 'AR', currency: 'ARS', region: 'AMERICAS', priority: 45 },
  { ko: '브라질',       en: 'Brazil',       iso: 'BR', currency: 'BRL', region: 'AMERICAS', priority: 30 },
  { ko: '칠레',         en: 'Chile',        iso: 'CL', currency: 'CLP', region: 'AMERICAS', priority: 45 },
  // MEA (7)
  { ko: '남아프리카공화국', en: 'South Africa', iso: 'ZA', currency: 'ZAR', region: 'MEA', priority: 45 },
  { ko: '레바논',       en: 'Lebanon',      iso: 'LB', currency: 'LBP', region: 'MEA',     priority: 80 },
  { ko: '사우디아라비아', en: 'Saudi Arabia', iso: 'SA', currency: 'SAR', region: 'MEA',     priority: 30 },
  { ko: '아랍에미리트', en: 'UAE',          iso: 'AE', currency: 'AED', region: 'MEA',     priority: 15 },
  { ko: '요르단',       en: 'Jordan',       iso: 'JO', currency: 'JOD', region: 'MEA',     priority: 70 },
  { ko: '이집트',       en: 'Egypt',        iso: 'EG', currency: 'EGP', region: 'MEA',     priority: 60 },
  { ko: '쿠웨이트',     en: 'Kuwait',       iso: 'KW', currency: 'KWD', region: 'MEA',     priority: 50 },
  { ko: '터키',         en: 'Turkey',       iso: 'TR', currency: 'TRY', region: 'MEA',     priority: 35 },
];

export const ISO_CODES = COUNTRIES.map(c => c.iso).sort();

export function findCountry(iso: string): CountryEntry | undefined {
  return COUNTRIES.find(c => c.iso === iso);
}

/** Flag emoji from ISO 3166-1 alpha-2 */
export function isoToFlagEmoji(iso: string): string {
  if (!iso || iso.length !== 2) return '';
  return iso.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');
}
