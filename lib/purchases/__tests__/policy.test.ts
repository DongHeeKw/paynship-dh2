import { describe, expect, it } from 'vitest';
import { validateProductUrl } from '../product-url';
import { intakeDecision } from '../categories';
import { calculatePurchaseQuote } from '../quote';
import type { PurchaseReview } from '../review-schema';

const now = Date.parse('2026-10-11T00:00:00Z');
const review: PurchaseReview = {
  verifiedCategory: 'clothing', productName: 'Cotton shirt', productUnitPriceKrw: 14000, domesticShippingKrw: 0,
  exchangeRateKrwPerUsd: 1400, serviceFeeCents: 100, internationalShippingCents: 500, insuranceCents: 0,
  customsValueBasis: 'CIF', dutyBasisPoints: 500, taxBasisPoints: 1000, taxIncludesDuty: true, additionalTaxBaseCents: 0,
  hsCode: '610910', origin: 'KR', material: 'Cotton', weightKg: 0.3, dimensions: { l: 20, w: 20, h: 2 },
  rulesReference: 'https://www.customs.gov.sg/example', evidenceReference: 'https://www.musinsa.com/products/123',
  rulesVerifiedAt: '2026-10-10T00:00:00Z', rulesValidUntil: '2026-10-20T00:00:00Z', customsNotes: 'Operator verified this example against destination rules.',
  recipientEvidence: { method: 'NOT_REQUIRED', reference: 'https://www.customs.gov.sg/example', verifiedAt: '2026-10-10T00:00:00Z', validUntil: '2026-10-20T00:00:00Z', notes: 'Recipient requirements reviewed for this calculation example.' },
};

describe('URL intake security boundary', () => {
  it('canonicalizes product links without retaining tracking query data', () => {
    expect(validateProductUrl('https://www.coupang.com/vp/products/123?itemId=456&utm_source=test#detail')).toBe('https://www.coupang.com/vp/products/123?itemId=456');
  });
  it.each(['http://www.coupang.com/vp/products/123', 'https://www.coupang.com.attacker.example/vp/products/123',
    'https://user:pass@www.coupang.com/vp/products/123', 'https://127.0.0.1/vp/products/123',
    'https://www.coupang.com:8443/vp/products/123', 'https://www.coupang.com/login',
    'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do'])('rejects unsafe or non-product URL %s', url => {
    expect(() => validateProductUrl(url)).toThrow();
  });
});

describe('reviewed customs calculation', () => {
  it('uses reviewed quantities, freight, duty and tax without VAT profit offsets', () => {
    const quote = calculatePurchaseQuote(review, 2, 3, now);
    expect(quote).toMatchObject({ productCents: 2000, dutyCents: 125, taxCents: 263, totalCents: 2988, quoteVersion: 3 });
  });
  it('refuses expired, future or old rule evidence', () => {
    for (const patch of [{ rulesValidUntil: '2026-10-01T00:00:00Z' }, { rulesVerifiedAt: '2026-10-12T00:00:00Z' }, { rulesVerifiedAt: '2025-01-01T00:00:00Z' }]) {
      expect(() => calculatePurchaseQuote({ ...review, ...patch }, 1, 1, now)).toThrow();
    }
  });
  it('never treats category selection as customs clearance', () => {
    expect(intakeDecision('clothing')).toBe('REVIEW_REQUIRED');
    expect(intakeDecision('food')).toBe('OUT_OF_SCOPE');
    expect(() => calculatePurchaseQuote({ ...review, verifiedCategory: 'food' }, 1, 1, now)).toThrow();
  });
  it('does not approve excluded goods by relabeling their category', () => {
    for (const hsCode of ['020100', '060100', '210100', '300400', '000000', '770000', '990000']) {
      expect(() => calculatePurchaseQuote({ ...review, hsCode, verifiedCategory: 'books' }, 1, 1, now)).toThrow('outside');
    }
  });
});
