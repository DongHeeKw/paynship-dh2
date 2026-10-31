/**
 * Origin-FTA Lookup
 *
 * Determines FTA (Free Trade Agreement) preferential duty rates
 * based on product origin country and destination (Korea → target)
 *
 * Key FTA agreements for Korean imports:
 * - KORUS (Korea-US)
 * - Korea-EU
 * - Korea-China
 * - RCEP (Regional Comprehensive Economic Partnership)
 * - CPTPP (Comprehensive and Progressive TPP)
 *
 * @module lib/classifier/origin-fta-lookup
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface FTARateResult {
  /** Origin country code */
  originCountry: string;
  /** Destination country code */
  destinationCountry: string;
  /** HS code prefix matched */
  hsCodePrefix: string;
  /** Standard MFN (Most Favored Nation) duty rate */
  mfnRate: number;
  /** FTA preferential rate (if applicable) */
  preferentialRate: number | null;
  /** FTA agreement name */
  ftaName: string | null;
  /** Whether FTA is applicable */
  ftaApplicable: boolean;
  /** Savings percentage */
  savingsPercent: number;
  /** Requirements for FTA eligibility */
  requirements?: string[];
}

export interface CountryInfo {
  /** ISO 2-letter code */
  code: string;
  /** Country name in English */
  nameEn: string;
  /** Country name in Korean */
  nameKo: string;
  /** FTA agreements with Korea */
  ftaWithKorea: string[];
}

// ============================================================================
// FTA Agreement Data
// ============================================================================

/**
 * Korea's FTA partners and agreement names
 */
export const KOREA_FTA_AGREEMENTS: Record<string, {
  name: string;
  effectiveDate: string;
  countries: string[];
}> = {
  'KORUS': {
    name: 'Korea-US Free Trade Agreement',
    effectiveDate: '2012-03-15',
    countries: ['US'],
  },
  'KOREU': {
    name: 'Korea-EU Free Trade Agreement',
    effectiveDate: '2011-07-01',
    countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'SE', 'DK', 'FI', 'IE', 'PT', 'GR', 'CZ', 'RO', 'HU', 'SK', 'BG', 'HR', 'SI', 'LT', 'LV', 'EE', 'CY', 'LU', 'MT'],
  },
  'KORCHINA': {
    name: 'Korea-China Free Trade Agreement',
    effectiveDate: '2015-12-20',
    countries: ['CN'],
  },
  'KORVN': {
    name: 'Korea-Vietnam Free Trade Agreement',
    effectiveDate: '2015-12-20',
    countries: ['VN'],
  },
  'KORAUL': {
    name: 'Korea-Australia Free Trade Agreement',
    effectiveDate: '2014-12-12',
    countries: ['AU'],
  },
  'KORUK': {
    name: 'Korea-UK Free Trade Agreement',
    effectiveDate: '2021-01-01',
    countries: ['GB'],
  },
  'KORINDIA': {
    name: 'Korea-India CEPA',
    effectiveDate: '2010-01-01',
    countries: ['IN'],
  },
  'RCEP': {
    name: 'Regional Comprehensive Economic Partnership',
    effectiveDate: '2022-02-01',
    countries: ['CN', 'JP', 'AU', 'NZ', 'VN', 'TH', 'MY', 'SG', 'ID', 'PH', 'BN', 'KH', 'LA', 'MM'],
  },
  'ASEAN': {
    name: 'Korea-ASEAN Free Trade Agreement',
    effectiveDate: '2007-06-01',
    countries: ['VN', 'TH', 'MY', 'SG', 'ID', 'PH', 'BN', 'KH', 'LA', 'MM'],
  },
};

/**
 * Country code to info mapping
 */
export const COUNTRY_INFO: Record<string, CountryInfo> = {
  'US': { code: 'US', nameEn: 'United States', nameKo: '미국', ftaWithKorea: ['KORUS'] },
  'CN': { code: 'CN', nameEn: 'China', nameKo: '중국', ftaWithKorea: ['KORCHINA', 'RCEP'] },
  'JP': { code: 'JP', nameEn: 'Japan', nameKo: '일본', ftaWithKorea: ['RCEP'] },
  'DE': { code: 'DE', nameEn: 'Germany', nameKo: '독일', ftaWithKorea: ['KOREU'] },
  'FR': { code: 'FR', nameEn: 'France', nameKo: '프랑스', ftaWithKorea: ['KOREU'] },
  'IT': { code: 'IT', nameEn: 'Italy', nameKo: '이탈리아', ftaWithKorea: ['KOREU'] },
  'GB': { code: 'GB', nameEn: 'United Kingdom', nameKo: '영국', ftaWithKorea: ['KORUK'] },
  'VN': { code: 'VN', nameEn: 'Vietnam', nameKo: '베트남', ftaWithKorea: ['KORVN', 'ASEAN', 'RCEP'] },
  'TH': { code: 'TH', nameEn: 'Thailand', nameKo: '태국', ftaWithKorea: ['ASEAN', 'RCEP'] },
  'AU': { code: 'AU', nameEn: 'Australia', nameKo: '호주', ftaWithKorea: ['KORAUL', 'RCEP'] },
  'TW': { code: 'TW', nameEn: 'Taiwan', nameKo: '대만', ftaWithKorea: [] },
  'HK': { code: 'HK', nameEn: 'Hong Kong', nameKo: '홍콩', ftaWithKorea: [] },
  'SG': { code: 'SG', nameEn: 'Singapore', nameKo: '싱가포르', ftaWithKorea: ['ASEAN', 'RCEP'] },
  'MY': { code: 'MY', nameEn: 'Malaysia', nameKo: '말레이시아', ftaWithKorea: ['ASEAN', 'RCEP'] },
  'ID': { code: 'ID', nameEn: 'Indonesia', nameKo: '인도네시아', ftaWithKorea: ['ASEAN', 'RCEP'] },
  'PH': { code: 'PH', nameEn: 'Philippines', nameKo: '필리핀', ftaWithKorea: ['ASEAN', 'RCEP'] },
  'IN': { code: 'IN', nameEn: 'India', nameKo: '인도', ftaWithKorea: ['KORINDIA'] },
  'NZ': { code: 'NZ', nameEn: 'New Zealand', nameKo: '뉴질랜드', ftaWithKorea: ['RCEP'] },
  'CA': { code: 'CA', nameEn: 'Canada', nameKo: '캐나다', ftaWithKorea: [] },
  'MX': { code: 'MX', nameEn: 'Mexico', nameKo: '멕시코', ftaWithKorea: [] },
};

/**
 * Base MFN duty rates by HS code prefix (simplified)
 * Real rates vary by specific 10-digit HS code
 */
const MFN_RATES: Record<string, number> = {
  '33': 6.5,   // Cosmetics
  '61': 13.0,  // Knitted apparel
  '62': 13.0,  // Woven apparel
  '64': 13.0,  // Footwear
  '42': 8.0,   // Leather goods
  '71': 8.0,   // Jewelry
  '85': 0.0,   // Electronics
  '84': 0.0,   // Machinery
  '95': 8.0,   // Toys
  '49': 0.0,   // Books
};

/**
 * FTA preferential rate multipliers (simplified)
 * 0 = duty-free, 0.5 = 50% of MFN rate, etc.
 */
const FTA_RATE_MULTIPLIERS: Record<string, Record<string, number>> = {
  'KORUS': {
    '33': 0,     // Cosmetics: duty-free
    '61': 0,     // Apparel: duty-free
    '62': 0,     // Apparel: duty-free
    '64': 0,     // Footwear: duty-free
    '42': 0,     // Leather: duty-free
    '85': 0,     // Electronics: already 0
  },
  'KOREU': {
    '33': 0,     // Cosmetics: duty-free
    '61': 0,     // Apparel: duty-free
    '62': 0,     // Apparel: duty-free
    '64': 0,     // Footwear: duty-free
    '42': 0,     // Leather: duty-free
  },
  'KORCHINA': {
    '33': 0.5,   // Cosmetics: 50% reduction
    '61': 0.7,   // Apparel: 30% reduction
    '62': 0.7,   // Apparel: 30% reduction
    '85': 0,     // Electronics: duty-free
  },
  'RCEP': {
    '33': 0.8,   // Cosmetics: 20% reduction
    '61': 0.8,   // Apparel: 20% reduction
    '85': 0,     // Electronics: duty-free
  },
};

// ============================================================================
// Origin Normalization
// ============================================================================

/**
 * Normalize origin string to ISO country code
 */
export function normalizeOrigin(origin: string): string | null {
  if (!origin) return null;

  const normalized = origin.trim().toUpperCase();

  // Already a valid 2-letter code
  if (/^[A-Z]{2}$/.test(normalized) && COUNTRY_INFO[normalized]) {
    return normalized;
  }

  // Try to match country name
  const searchTerms = [
    origin.toLowerCase(),
    origin.toUpperCase(),
  ];

  for (const [code, info] of Object.entries(COUNTRY_INFO)) {
    for (const term of searchTerms) {
      if (
        info.nameEn.toLowerCase().includes(term) ||
        term.includes(info.nameEn.toLowerCase()) ||
        info.nameKo.includes(origin) ||
        origin.includes(info.nameKo)
      ) {
        return code;
      }
    }
  }

  // Common variations
  const variations: Record<string, string> = {
    'usa': 'US',
    'america': 'US',
    'united states': 'US',
    'uk': 'GB',
    'britain': 'GB',
    'england': 'GB',
    'south korea': 'KR',
    'korea': 'KR',
    '대한민국': 'KR',
    '한국': 'KR',
  };

  const lowerOrigin = origin.toLowerCase();
  for (const [key, code] of Object.entries(variations)) {
    if (lowerOrigin.includes(key)) {
      return code;
    }
  }

  return null;
}

// ============================================================================
// FTA Lookup Functions
// ============================================================================

/**
 * Get applicable FTA for origin → Korea import
 */
export function getApplicableFTA(originCountryCode: string): string[] {
  const ftaList: string[] = [];

  for (const [ftaName, agreement] of Object.entries(KOREA_FTA_AGREEMENTS)) {
    if (agreement.countries.includes(originCountryCode)) {
      ftaList.push(ftaName);
    }
  }

  return ftaList;
}

/**
 * Get FTA preferential rate
 */
function getFTAPreferentialRate(
  ftaName: string,
  hsCodePrefix: string,
  mfnRate: number
): number | null {
  const multipliers = FTA_RATE_MULTIPLIERS[ftaName];
  if (!multipliers) return null;

  // Try exact prefix match, then shorter prefixes
  for (let len = hsCodePrefix.length; len >= 2; len--) {
    const prefix = hsCodePrefix.substring(0, len);
    if (multipliers[prefix] !== undefined) {
      return mfnRate * multipliers[prefix];
    }
  }

  return null;
}

/**
 * Get FTA rate from database
 */
async function getFTARateFromDB(
  originCountry: string,
  destinationCountry: string,
  hsCodePrefix: string
): Promise<{ rate: number; ftaName: string } | null> {
  try {
    const ftaRate = await prisma.ftaRate.findFirst({
      where: {
        originCountry,
        destinationCountry,
        hsCodePrefix: {
          startsWith: hsCodePrefix.substring(0, 2),
        },
        validFrom: {
          lte: new Date(),
        },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      orderBy: {
        hsCodePrefix: 'desc', // Prefer more specific matches
      },
    });

    if (ftaRate) {
      return {
        rate: ftaRate.preferentialRate,
        ftaName: ftaRate.ftaName,
      };
    }
  } catch (error) {
    logger.debug('OriginFTALookup', `DB lookup failed: ${error}`);
  }

  return null;
}

/**
 * Main FTA rate lookup function
 *
 * @param origin - Origin country (code or name)
 * @param destination - Destination country code (default: 'KR')
 * @param hsCode - HS code (6-10 digits)
 * @returns FTA rate result with savings calculation
 */
export async function getFTARate(
  origin: string,
  destination: string = 'KR',
  hsCode: string
): Promise<FTARateResult> {
  const originCode = normalizeOrigin(origin);
  const hsPrefix = hsCode.substring(0, 2);

  // Default result (no FTA)
  const mfnRate = MFN_RATES[hsPrefix] ?? 8.0;
  const result: FTARateResult = {
    originCountry: originCode || origin,
    destinationCountry: destination,
    hsCodePrefix: hsPrefix,
    mfnRate,
    preferentialRate: null,
    ftaName: null,
    ftaApplicable: false,
    savingsPercent: 0,
  };

  if (!originCode) {
    return result;
  }

  // Check applicable FTAs
  const applicableFTAs = getApplicableFTA(originCode);
  if (applicableFTAs.length === 0) {
    return result;
  }

  // Try DB lookup first
  const dbResult = await getFTARateFromDB(originCode, destination, hsCode);
  if (dbResult) {
    result.ftaName = dbResult.ftaName;
    result.preferentialRate = dbResult.rate;
    result.ftaApplicable = true;
    result.savingsPercent = mfnRate > 0 ? ((mfnRate - dbResult.rate) / mfnRate) * 100 : 0;
    return result;
  }

  // Fall back to static lookup
  for (const ftaName of applicableFTAs) {
    const prefRate = getFTAPreferentialRate(ftaName, hsPrefix, mfnRate);
    if (prefRate !== null && (result.preferentialRate === null || prefRate < result.preferentialRate)) {
      result.ftaName = ftaName;
      result.preferentialRate = prefRate;
      result.ftaApplicable = true;
    }
  }

  if (result.ftaApplicable && result.preferentialRate !== null) {
    result.savingsPercent = mfnRate > 0 ? ((mfnRate - result.preferentialRate) / mfnRate) * 100 : 0;
  }

  return result;
}

/**
 * Quick check if FTA is available for a country
 */
export function hasFTAWithKorea(countryCode: string): boolean {
  const info = COUNTRY_INFO[countryCode.toUpperCase()];
  return info ? info.ftaWithKorea.length > 0 : false;
}

/**
 * Get FTA requirements (simplified)
 */
export function getFTARequirements(ftaName: string): string[] {
  const commonRequirements = [
    'Certificate of Origin required',
    'Product must meet Rules of Origin criteria',
    'Direct shipment preferred',
  ];

  const specificRequirements: Record<string, string[]> = {
    'KORUS': [
      ...commonRequirements,
      'Korean Customs Form B/L required',
    ],
    'KOREU': [
      ...commonRequirements,
      'EUR.1 movement certificate or invoice declaration',
    ],
    'KORCHINA': [
      ...commonRequirements,
      'Certificate issued by authorized body',
    ],
  };

  return specificRequirements[ftaName] || commonRequirements;
}
