/**
 * Seed Script - Business Rate Tables
 *
 * 배송료, 관세율, 세금 테이블 초기 데이터 삽입
 *
 * 실행: npx tsx scripts/seed-rates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// 배송료 데이터 (기존 SHIPPING_RATES에서 이관)
// ============================================================================
const shippingRates = [
  { countryCode: 'US', countryName: 'United States', ratePerKg: 15, baseRate: 12, estimatedDays: '7-14', sortOrder: 1 },
  { countryCode: 'CA', countryName: 'Canada', ratePerKg: 16, baseRate: 13, estimatedDays: '7-14', sortOrder: 2 },
  { countryCode: 'GB', countryName: 'United Kingdom', ratePerKg: 17, baseRate: 14, estimatedDays: '7-14', sortOrder: 3 },
  { countryCode: 'AU', countryName: 'Australia', ratePerKg: 18, baseRate: 15, estimatedDays: '7-14', sortOrder: 4 },
  { countryCode: 'JP', countryName: 'Japan', ratePerKg: 12, baseRate: 10, estimatedDays: '3-7', sortOrder: 5 },
  { countryCode: 'CN', countryName: 'China', ratePerKg: 12, baseRate: 10, estimatedDays: '5-10', sortOrder: 6 },
  { countryCode: 'SG', countryName: 'Singapore', ratePerKg: 14, baseRate: 12, estimatedDays: '5-10', sortOrder: 7 },
  { countryCode: 'TH', countryName: 'Thailand', ratePerKg: 15, baseRate: 12, estimatedDays: '7-14', sortOrder: 8 },
  { countryCode: 'VN', countryName: 'Vietnam', ratePerKg: 15, baseRate: 12, estimatedDays: '7-14', sortOrder: 9 },
  { countryCode: 'DE', countryName: 'Germany', ratePerKg: 17, baseRate: 14, estimatedDays: '7-14', sortOrder: 10 },
  { countryCode: 'FR', countryName: 'France', ratePerKg: 17, baseRate: 14, estimatedDays: '7-14', sortOrder: 11 },
  { countryCode: 'IT', countryName: 'Italy', ratePerKg: 17, baseRate: 14, estimatedDays: '7-14', sortOrder: 12 },
  { countryCode: 'ES', countryName: 'Spain', ratePerKg: 17, baseRate: 14, estimatedDays: '7-14', sortOrder: 13 },
  { countryCode: 'NL', countryName: 'Netherlands', ratePerKg: 17, baseRate: 14, estimatedDays: '7-14', sortOrder: 14 },
  { countryCode: 'BR', countryName: 'Brazil', ratePerKg: 20, baseRate: 18, estimatedDays: '14-21', sortOrder: 15 },
  { countryCode: 'MX', countryName: 'Mexico', ratePerKg: 18, baseRate: 15, estimatedDays: '10-14', sortOrder: 16 },
  { countryCode: 'IN', countryName: 'India', ratePerKg: 16, baseRate: 13, estimatedDays: '10-14', sortOrder: 17 },
  { countryCode: 'HK', countryName: 'Hong Kong', ratePerKg: 13, baseRate: 11, estimatedDays: '5-10', sortOrder: 18 },
  { countryCode: 'TW', countryName: 'Taiwan', ratePerKg: 13, baseRate: 11, estimatedDays: '5-10', sortOrder: 19 },
  { countryCode: 'MY', countryName: 'Malaysia', ratePerKg: 14, baseRate: 12, estimatedDays: '7-14', sortOrder: 20 },
  { countryCode: 'PH', countryName: 'Philippines', ratePerKg: 15, baseRate: 12, estimatedDays: '7-14', sortOrder: 21 },
  { countryCode: 'ID', countryName: 'Indonesia', ratePerKg: 15, baseRate: 12, estimatedDays: '7-14', sortOrder: 22 },
  // Default (Other)
  { countryCode: 'XX', countryName: 'Other', ratePerKg: 20, baseRate: 15, estimatedDays: '14-21', sortOrder: 999 },
];

// ============================================================================
// HS Code 관세율 데이터
// ============================================================================
const hsCodeRates = [
  // Fashion & Apparel
  { hsCode: '61', description: 'Clothing - Knitted', dutyRate: 0.165, notes: '니트 의류' },
  { hsCode: '62', description: 'Clothing - Woven', dutyRate: 0.165, notes: '직물 의류' },
  { hsCode: '6204', description: 'Women\'s suits/dresses', dutyRate: 0.165, notes: '여성 정장/드레스' },
  { hsCode: '64', description: 'Footwear', dutyRate: 0.125, notes: '신발류' },
  { hsCode: '42', description: 'Leather goods, handbags', dutyRate: 0.088, notes: '가죽 제품, 핸드백' },

  // Beauty & Cosmetics
  { hsCode: '33', description: 'Cosmetics & perfumes', dutyRate: 0.0, notes: '화장품, 향수 (무관세)' },
  { hsCode: '3304', description: 'Beauty/makeup products', dutyRate: 0.0, notes: '메이크업 제품' },
  { hsCode: '3305', description: 'Hair care products', dutyRate: 0.0, notes: '헤어케어 제품' },

  // Electronics
  { hsCode: '85', description: 'Electronics & appliances', dutyRate: 0.0, notes: '전자제품 (무관세)' },
  { hsCode: '8517', description: 'Phones & accessories', dutyRate: 0.0, notes: '휴대폰, 액세서리' },
  { hsCode: '8523', description: 'Recording media (CDs, USBs)', dutyRate: 0.0, notes: '음반, USB' },

  // Food & Snacks
  { hsCode: '17', description: 'Candy & confectionery', dutyRate: 0.046, notes: '사탕, 과자류' },
  { hsCode: '19', description: 'Snacks, baked goods', dutyRate: 0.04, notes: '스낵, 빵류' },
  { hsCode: '20', description: 'Preserved fruits/vegetables', dutyRate: 0.05, notes: '가공식품' },
  { hsCode: '21', description: 'Food preparations', dutyRate: 0.064, notes: '조미료, 소스' },
  { hsCode: '2106', description: 'Food supplements', dutyRate: 0.064, notes: '건강기능식품' },

  // K-pop & Entertainment
  { hsCode: '49', description: 'Books, albums, printed material', dutyRate: 0.0, notes: '책, 앨범 (무관세)' },
  { hsCode: '4901', description: 'Printed books', dutyRate: 0.0, notes: '인쇄 서적' },
  { hsCode: '95', description: 'Toys & collectibles', dutyRate: 0.0, notes: '장난감, 굿즈' },
  { hsCode: '9503', description: 'Dolls, toys, models', dutyRate: 0.0, notes: '인형, 피규어' },

  // Home & Living
  { hsCode: '63', description: 'Textiles, bedding', dutyRate: 0.11, notes: '침구류, 직물' },
  { hsCode: '69', description: 'Ceramics', dutyRate: 0.06, notes: '도자기' },
  { hsCode: '7117', description: 'Imitation jewelry', dutyRate: 0.11, notes: '모조 보석' },

  // Accessories
  { hsCode: '71', description: 'Jewelry & precious metals', dutyRate: 0.065, notes: '귀금속, 보석' },
  { hsCode: '9113', description: 'Watch bands', dutyRate: 0.0, notes: '시계 밴드' },

  // Default
  { hsCode: '00', description: 'General merchandise (default)', dutyRate: 0.05, notes: '기본 관세율' },
];

// ============================================================================
// 카테고리별 추정값 매핑 (무게, 치수, HS Code, Aliases)
// 2025-01-04: aliases 필드 추가 (퍼지 매칭용)
// ============================================================================
const categoryMappings = [
  // Fashion & Apparel
  {
    category: 'fashion',
    displayName: '패션',
    aliases: ['패션', 'apparel', 'wear', '옷', '의상'],
    estimatedWeightKg: 0.5,
    dimensionL: 35, dimensionW: 25, dimensionH: 5,
    hsCodePrefix: '62',
    sortOrder: 1,
  },
  {
    category: 'clothing',
    displayName: '의류',
    aliases: ['의류', 'clothes', 'cloth', 'garment', '옷', '티셔츠', 't-shirt', 'tshirt', 'shirt', 'pants', 'jeans'],
    estimatedWeightKg: 0.4,
    dimensionL: 35, dimensionW: 25, dimensionH: 5,
    hsCodePrefix: '62',
    sortOrder: 2,
  },
  {
    category: 'shoes',
    displayName: '신발',
    aliases: ['신발', 'footwear', 'sneakers', 'boots', '운동화', '구두', 'sandals', 'slippers'],
    estimatedWeightKg: 1.0,
    dimensionL: 35, dimensionW: 25, dimensionH: 15,
    hsCodePrefix: '64',
    sortOrder: 3,
  },
  {
    category: 'bags',
    displayName: '가방',
    aliases: ['가방', 'bag', 'handbag', 'backpack', 'purse', '핸드백', '백팩', '숄더백', 'tote'],
    estimatedWeightKg: 0.8,
    dimensionL: 40, dimensionW: 30, dimensionH: 15,
    hsCodePrefix: '42',
    sortOrder: 4,
  },
  {
    category: 'accessories',
    displayName: '액세서리',
    aliases: ['액세서리', 'accessory', 'jewelry', 'jewellery', '주얼리', '보석', 'watch', '시계', 'ring', 'necklace'],
    estimatedWeightKg: 0.2,
    dimensionL: 15, dimensionW: 10, dimensionH: 5,
    hsCodePrefix: '71',
    sortOrder: 5,
  },

  // Beauty & Cosmetics
  {
    category: 'beauty',
    displayName: '뷰티',
    aliases: ['뷰티', 'beauty', 'makeup', 'make-up', '메이크업', 'cosmetic'],
    estimatedWeightKg: 0.3,
    dimensionL: 20, dimensionW: 15, dimensionH: 10,
    hsCodePrefix: '33',
    sortOrder: 6,
  },
  {
    category: 'cosmetics',
    displayName: '화장품',
    aliases: ['화장품', 'cosmetics', 'makeup', 'foundation', 'lipstick', '립스틱', '파운데이션'],
    estimatedWeightKg: 0.25,
    dimensionL: 15, dimensionW: 10, dimensionH: 8,
    hsCodePrefix: '33',
    sortOrder: 7,
  },
  {
    category: 'skincare',
    displayName: '스킨케어',
    aliases: ['스킨케어', 'skincare', 'skin care', 'serum', 'cream', '크림', '세럼', 'lotion', 'moisturizer', '토너', 'toner'],
    estimatedWeightKg: 0.35,
    dimensionL: 20, dimensionW: 15, dimensionH: 10,
    hsCodePrefix: '33',
    sortOrder: 8,
  },

  // Electronics
  {
    category: 'electronics',
    displayName: '전자제품',
    aliases: ['전자제품', 'electronics', 'electronic', 'gadget', 'device', '가전', 'appliance'],
    estimatedWeightKg: 1.0,
    dimensionL: 40, dimensionW: 30, dimensionH: 15,
    hsCodePrefix: '85',
    sortOrder: 9,
  },
  {
    category: 'phones',
    displayName: '휴대폰',
    aliases: ['휴대폰', 'phone', 'smartphone', 'mobile', 'cellphone', '스마트폰', 'iphone', 'samsung', 'galaxy'],
    estimatedWeightKg: 0.3,
    dimensionL: 18, dimensionW: 10, dimensionH: 5,
    hsCodePrefix: '85',
    sortOrder: 10,
  },

  // Food & Health
  {
    category: 'food',
    displayName: '식품',
    aliases: ['식품', 'food', 'snack', 'snacks', '스낵', '과자', 'candy', 'chocolate', '초콜릿', '라면', 'ramen', 'noodles'],
    estimatedWeightKg: 0.5,
    dimensionL: 25, dimensionW: 20, dimensionH: 15,
    hsCodePrefix: '19',
    sortOrder: 11,
  },
  {
    category: 'health',
    displayName: '건강식품',
    aliases: ['건강식품', 'health', 'supplement', 'supplements', '영양제', 'vitamin', '비타민', 'protein', '프로틴'],
    estimatedWeightKg: 0.4,
    dimensionL: 20, dimensionW: 15, dimensionH: 10,
    hsCodePrefix: '21',
    sortOrder: 12,
  },

  // K-pop & Entertainment
  {
    category: 'kpop',
    displayName: 'K-POP',
    aliases: ['kpop', 'k-pop', 'k pop', '케이팝', 'bts', 'blackpink', 'twice', 'exo', 'nct', 'stray kids', 'aespa', 'ive', 'newjeans'],
    estimatedWeightKg: 0.5,
    dimensionL: 35, dimensionW: 30, dimensionH: 10,
    hsCodePrefix: '49',
    sortOrder: 13,
  },
  {
    category: 'album',
    displayName: '앨범',
    aliases: ['앨범', 'album', 'cd', 'vinyl', 'record', '음반', 'photobook', '포토북', 'photocard', '포토카드'],
    estimatedWeightKg: 0.6,
    dimensionL: 32, dimensionW: 28, dimensionH: 5,
    hsCodePrefix: '49',
    sortOrder: 14,
  },
  {
    category: 'merchandise',
    displayName: '굿즈',
    aliases: ['굿즈', 'merch', 'merchandise', 'goods', '상품', 'lightstick', '응원봉', 'poster', '포스터', 'figure', '피규어'],
    estimatedWeightKg: 0.3,
    dimensionL: 25, dimensionW: 20, dimensionH: 10,
    hsCodePrefix: '95',
    sortOrder: 15,
  },

  // Home & Living
  {
    category: 'home',
    displayName: '홈/리빙',
    aliases: ['홈', 'home', 'living', '리빙', 'furniture', '가구', 'decor', '인테리어', 'kitchen', '주방', 'bedding', '침구'],
    estimatedWeightKg: 1.5,
    dimensionL: 50, dimensionW: 40, dimensionH: 30,
    hsCodePrefix: '63',
    sortOrder: 16,
  },

  // Default
  {
    category: 'other',
    displayName: '기타',
    aliases: ['기타', 'other', 'misc', 'miscellaneous', '일반'],
    estimatedWeightKg: 0.5,
    dimensionL: 30, dimensionW: 20, dimensionH: 10,
    hsCodePrefix: '99',
    sortOrder: 999,
  },
];

// ============================================================================
// FTA 세율 데이터 (한국 원산지 → 주요 수출국)
// 2025-01-04: 신규 추가 (Origin → FTA 세율 조회용)
// ============================================================================
const ftaRates = [
  // KORUS (한-미 FTA) - 대부분 무관세
  { originCountry: 'KR', destinationCountry: 'US', hsCodePrefix: '33', ftaName: 'KORUS', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'US', hsCodePrefix: '49', ftaName: 'KORUS', preferentialRate: 0.0, notes: 'Books/Albums - duty free' },
  { originCountry: 'KR', destinationCountry: 'US', hsCodePrefix: '61', ftaName: 'KORUS', preferentialRate: 0.0, notes: 'Knit clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'US', hsCodePrefix: '62', ftaName: 'KORUS', preferentialRate: 0.0, notes: 'Woven clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'US', hsCodePrefix: '64', ftaName: 'KORUS', preferentialRate: 0.0, notes: 'Footwear - duty free' },
  { originCountry: 'KR', destinationCountry: 'US', hsCodePrefix: '85', ftaName: 'KORUS', preferentialRate: 0.0, notes: 'Electronics - duty free' },
  { originCountry: 'KR', destinationCountry: 'US', hsCodePrefix: '95', ftaName: 'KORUS', preferentialRate: 0.0, notes: 'Toys - duty free' },

  // Korea-EU FTA - 대부분 무관세
  { originCountry: 'KR', destinationCountry: 'DE', hsCodePrefix: '33', ftaName: 'KOREU', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'DE', hsCodePrefix: '61', ftaName: 'KOREU', preferentialRate: 0.0, notes: 'Clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'DE', hsCodePrefix: '62', ftaName: 'KOREU', preferentialRate: 0.0, notes: 'Clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'DE', hsCodePrefix: '85', ftaName: 'KOREU', preferentialRate: 0.0, notes: 'Electronics - duty free' },
  { originCountry: 'KR', destinationCountry: 'FR', hsCodePrefix: '33', ftaName: 'KOREU', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'FR', hsCodePrefix: '61', ftaName: 'KOREU', preferentialRate: 0.0, notes: 'Clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'FR', hsCodePrefix: '62', ftaName: 'KOREU', preferentialRate: 0.0, notes: 'Clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'GB', hsCodePrefix: '33', ftaName: 'KORUK', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'GB', hsCodePrefix: '61', ftaName: 'KORUK', preferentialRate: 0.0, notes: 'Clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'GB', hsCodePrefix: '62', ftaName: 'KORUK', preferentialRate: 0.0, notes: 'Clothing - duty free' },

  // RCEP (역내포괄적경제동반자협정) - 아시아 국가들
  { originCountry: 'KR', destinationCountry: 'JP', hsCodePrefix: '33', ftaName: 'RCEP', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'JP', hsCodePrefix: '49', ftaName: 'RCEP', preferentialRate: 0.0, notes: 'Books/Albums - duty free' },
  { originCountry: 'KR', destinationCountry: 'JP', hsCodePrefix: '85', ftaName: 'RCEP', preferentialRate: 0.0, notes: 'Electronics - duty free' },
  { originCountry: 'KR', destinationCountry: 'CN', hsCodePrefix: '33', ftaName: 'KORCHINA', preferentialRate: 0.05, notes: 'Cosmetics - 5%' },
  { originCountry: 'KR', destinationCountry: 'CN', hsCodePrefix: '85', ftaName: 'KORCHINA', preferentialRate: 0.0, notes: 'Electronics - duty free' },
  { originCountry: 'KR', destinationCountry: 'SG', hsCodePrefix: '33', ftaName: 'KORASEAN', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'SG', hsCodePrefix: '85', ftaName: 'KORASEAN', preferentialRate: 0.0, notes: 'Electronics - duty free' },
  { originCountry: 'KR', destinationCountry: 'VN', hsCodePrefix: '33', ftaName: 'KORVN', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'VN', hsCodePrefix: '61', ftaName: 'KORVN', preferentialRate: 0.0, notes: 'Clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'TH', hsCodePrefix: '33', ftaName: 'KORASEAN', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'MY', hsCodePrefix: '33', ftaName: 'KORASEAN', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'ID', hsCodePrefix: '33', ftaName: 'KORASEAN', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'PH', hsCodePrefix: '33', ftaName: 'KORASEAN', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },

  // Korea-Australia FTA
  { originCountry: 'KR', destinationCountry: 'AU', hsCodePrefix: '33', ftaName: 'KAFTA', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'AU', hsCodePrefix: '61', ftaName: 'KAFTA', preferentialRate: 0.0, notes: 'Clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'AU', hsCodePrefix: '62', ftaName: 'KAFTA', preferentialRate: 0.0, notes: 'Clothing - duty free' },
  { originCountry: 'KR', destinationCountry: 'AU', hsCodePrefix: '85', ftaName: 'KAFTA', preferentialRate: 0.0, notes: 'Electronics - duty free' },

  // Korea-Canada
  { originCountry: 'KR', destinationCountry: 'CA', hsCodePrefix: '33', ftaName: 'CKFTA', preferentialRate: 0.0, notes: 'Cosmetics - duty free' },
  { originCountry: 'KR', destinationCountry: 'CA', hsCodePrefix: '85', ftaName: 'CKFTA', preferentialRate: 0.0, notes: 'Electronics - duty free' },

  // 중국 원산지 (China origin) - 다른 국가 수출 시
  { originCountry: 'CN', destinationCountry: 'US', hsCodePrefix: '61', ftaName: 'MFN', preferentialRate: 0.165, notes: 'No FTA - MFN rate' },
  { originCountry: 'CN', destinationCountry: 'US', hsCodePrefix: '62', ftaName: 'MFN', preferentialRate: 0.165, notes: 'No FTA - MFN rate' },
  { originCountry: 'CN', destinationCountry: 'US', hsCodePrefix: '64', ftaName: 'MFN', preferentialRate: 0.125, notes: 'No FTA - MFN rate' },
  { originCountry: 'CN', destinationCountry: 'KR', hsCodePrefix: '61', ftaName: 'KORCHINA', preferentialRate: 0.13, notes: 'Korea-China FTA' },
  { originCountry: 'CN', destinationCountry: 'KR', hsCodePrefix: '62', ftaName: 'KORCHINA', preferentialRate: 0.13, notes: 'Korea-China FTA' },

  // 베트남 원산지 (Vietnam origin)
  { originCountry: 'VN', destinationCountry: 'US', hsCodePrefix: '61', ftaName: 'MFN', preferentialRate: 0.165, notes: 'No FTA - MFN rate' },
  { originCountry: 'VN', destinationCountry: 'US', hsCodePrefix: '62', ftaName: 'MFN', preferentialRate: 0.165, notes: 'No FTA - MFN rate' },
  { originCountry: 'VN', destinationCountry: 'KR', hsCodePrefix: '61', ftaName: 'KORVN', preferentialRate: 0.0, notes: 'Korea-Vietnam FTA' },
  { originCountry: 'VN', destinationCountry: 'JP', hsCodePrefix: '61', ftaName: 'RCEP', preferentialRate: 0.0, notes: 'RCEP' },

  // 일본 원산지 (Japan origin)
  { originCountry: 'JP', destinationCountry: 'KR', hsCodePrefix: '85', ftaName: 'RCEP', preferentialRate: 0.0, notes: 'RCEP - Electronics' },
  { originCountry: 'JP', destinationCountry: 'US', hsCodePrefix: '85', ftaName: 'MFN', preferentialRate: 0.0, notes: 'ITA - Electronics duty free' },
];

// ============================================================================
// 국가별 세금 데이터
// ============================================================================
const countryTaxRates = [
  {
    countryCode: 'US',
    countryName: 'United States',
    salesTaxRate: 0.08,
    taxName: 'Sales Tax',
    dutyThreshold: 800,
    taxThreshold: 0,
    notes: 'Section 321 de minimis $800',
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    salesTaxRate: 0.13,
    taxName: 'HST/GST',
    dutyThreshold: 20,
    taxThreshold: 20,
    notes: 'CAD 20 threshold',
  },
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    salesTaxRate: 0.20,
    taxName: 'VAT',
    dutyThreshold: 135,
    taxThreshold: 135,
    notes: 'GBP 135 threshold',
  },
  {
    countryCode: 'AU',
    countryName: 'Australia',
    salesTaxRate: 0.10,
    taxName: 'GST',
    dutyThreshold: 1000,
    taxThreshold: 1000,
    notes: 'AUD 1000 threshold',
  },
  {
    countryCode: 'JP',
    countryName: 'Japan',
    salesTaxRate: 0.10,
    taxName: 'Consumption Tax',
    dutyThreshold: 130,
    taxThreshold: 130,
    notes: 'JPY 16,666 threshold',
  },
  {
    countryCode: 'SG',
    countryName: 'Singapore',
    salesTaxRate: 0.09,
    taxName: 'GST',
    dutyThreshold: 400,
    taxThreshold: 400,
    notes: 'SGD 400 threshold',
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    salesTaxRate: 0.19,
    taxName: 'VAT',
    dutyThreshold: 150,
    taxThreshold: 150,
    notes: 'EUR 150 threshold',
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    salesTaxRate: 0.20,
    taxName: 'VAT',
    dutyThreshold: 150,
    taxThreshold: 150,
    notes: 'EUR 150 threshold',
  },
  {
    countryCode: 'IT',
    countryName: 'Italy',
    salesTaxRate: 0.22,
    taxName: 'VAT',
    dutyThreshold: 150,
    taxThreshold: 150,
    notes: 'EUR 150 threshold',
  },
  {
    countryCode: 'ES',
    countryName: 'Spain',
    salesTaxRate: 0.21,
    taxName: 'VAT',
    dutyThreshold: 150,
    taxThreshold: 150,
    notes: 'EUR 150 threshold',
  },
  {
    countryCode: 'NL',
    countryName: 'Netherlands',
    salesTaxRate: 0.21,
    taxName: 'VAT',
    dutyThreshold: 150,
    taxThreshold: 150,
    notes: 'EUR 150 threshold',
  },
  {
    countryCode: 'CN',
    countryName: 'China',
    salesTaxRate: 0.13,
    taxName: 'VAT',
    dutyThreshold: 50,
    taxThreshold: 50,
    notes: 'CNY 50 threshold',
  },
  {
    countryCode: 'HK',
    countryName: 'Hong Kong',
    salesTaxRate: 0.0,
    taxName: 'None',
    dutyThreshold: 9999,
    taxThreshold: 9999,
    notes: 'Free port - no import duties',
  },
  {
    countryCode: 'TW',
    countryName: 'Taiwan',
    salesTaxRate: 0.05,
    taxName: 'VAT',
    dutyThreshold: 2000,
    taxThreshold: 2000,
    notes: 'TWD 2000 threshold',
  },
  {
    countryCode: 'TH',
    countryName: 'Thailand',
    salesTaxRate: 0.07,
    taxName: 'VAT',
    dutyThreshold: 1500,
    taxThreshold: 1500,
    notes: 'THB 1500 threshold',
  },
  {
    countryCode: 'VN',
    countryName: 'Vietnam',
    salesTaxRate: 0.10,
    taxName: 'VAT',
    dutyThreshold: 1000000,
    taxThreshold: 1000000,
    notes: 'VND 1M threshold',
  },
  {
    countryCode: 'MY',
    countryName: 'Malaysia',
    salesTaxRate: 0.10,
    taxName: 'SST',
    dutyThreshold: 500,
    taxThreshold: 500,
    notes: 'MYR 500 threshold',
  },
  {
    countryCode: 'PH',
    countryName: 'Philippines',
    salesTaxRate: 0.12,
    taxName: 'VAT',
    dutyThreshold: 10000,
    taxThreshold: 10000,
    notes: 'PHP 10000 threshold',
  },
  {
    countryCode: 'ID',
    countryName: 'Indonesia',
    salesTaxRate: 0.11,
    taxName: 'VAT',
    dutyThreshold: 75,
    taxThreshold: 75,
    notes: 'USD 75 threshold',
  },
  {
    countryCode: 'IN',
    countryName: 'India',
    salesTaxRate: 0.18,
    taxName: 'GST',
    dutyThreshold: 0,
    taxThreshold: 0,
    notes: 'No de minimis',
  },
  {
    countryCode: 'BR',
    countryName: 'Brazil',
    salesTaxRate: 0.17,
    taxName: 'ICMS',
    dutyThreshold: 50,
    taxThreshold: 50,
    notes: 'USD 50 threshold',
  },
  {
    countryCode: 'MX',
    countryName: 'Mexico',
    salesTaxRate: 0.16,
    taxName: 'IVA',
    dutyThreshold: 50,
    taxThreshold: 50,
    notes: 'USD 50 threshold',
  },
  // Default
  {
    countryCode: 'XX',
    countryName: 'Other',
    salesTaxRate: 0.10,
    taxName: 'Tax',
    dutyThreshold: 100,
    taxThreshold: 100,
    notes: 'Default rate',
  },
];

async function main() {
  console.log('🌱 Seeding business rate tables...\n');

  // Shipping Rates
  console.log('📦 Seeding shipping rates...');
  for (const rate of shippingRates) {
    await prisma.shippingRate.upsert({
      where: { countryCode: rate.countryCode },
      update: rate,
      create: rate,
    });
  }
  console.log(`   ✓ ${shippingRates.length} shipping rates\n`);

  // HS Code Rates
  console.log('🏷️  Seeding HS code rates...');
  for (const rate of hsCodeRates) {
    await prisma.hsCodeRate.upsert({
      where: { hsCode: rate.hsCode },
      update: rate,
      create: rate,
    });
  }
  console.log(`   ✓ ${hsCodeRates.length} HS code rates\n`);

  // Category Mappings
  console.log('📂 Seeding category mappings...');
  for (const mapping of categoryMappings) {
    await prisma.categoryMapping.upsert({
      where: { category: mapping.category },
      update: mapping,
      create: mapping,
    });
  }
  console.log(`   ✓ ${categoryMappings.length} category mappings\n`);

  // Country Tax Rates
  console.log('💰 Seeding country tax rates...');
  for (const rate of countryTaxRates) {
    await prisma.countryTaxRate.upsert({
      where: { countryCode: rate.countryCode },
      update: rate,
      create: rate,
    });
  }
  console.log(`   ✓ ${countryTaxRates.length} country tax rates\n`);

  // FTA Rates (2025-01-04 추가)
  console.log('🌐 Seeding FTA preferential rates...');
  for (const rate of ftaRates) {
    await prisma.ftaRate.upsert({
      where: {
        originCountry_destinationCountry_hsCodePrefix_ftaName: {
          originCountry: rate.originCountry,
          destinationCountry: rate.destinationCountry,
          hsCodePrefix: rate.hsCodePrefix,
          ftaName: rate.ftaName,
        },
      },
      update: {
        preferentialRate: rate.preferentialRate,
        notes: rate.notes,
        validFrom: new Date('2020-01-01'),  // Default valid from date
      },
      create: {
        ...rate,
        validFrom: new Date('2020-01-01'),
      },
    });
  }
  console.log(`   ✓ ${ftaRates.length} FTA preferential rates\n`);

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
