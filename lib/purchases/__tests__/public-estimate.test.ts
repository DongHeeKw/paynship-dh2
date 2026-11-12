import { describe, expect, it } from 'vitest';
import published from '@/data/catalog/public-prices.json';
import { publicCostEstimate, publicPriceCatalogSchema } from '../public-estimate';

const now = Date.parse('2026-11-13T12:00:00Z');
const evidence = { reference: 'https://evidence.example/review', verifiedAt: '2026-11-13T10:00:00Z', expiresAt: '2026-11-13T20:00:00Z' };
const sourceUrl = 'https://www.musinsa.com/products/123';
const record = { sourceUrl, sku: 'TEST-BLUE-M', name: 'Synthetic test shirt', options: 'Blue / M', size: 'M', color: 'Blue', model: 'TEST', unitPriceKrw: 100000, productEvidence: evidence,
  routes: [{ destination: 'JP' as const, quantity: 1, domesticShippingKrw: 3000, internationalShippingKrw: 25000, insuranceKrw: 0, dutyKrw: 1000, taxKrw: 4000, clearanceKrw: 500,
    origin: 'VN', hsCode: '610910', material: 'Cotton', packagedWeightGrams: 500, packagedDimensionsMm: [300, 200, 100] as [number, number, number], carrier: 'TEST ONLY', importRegime: 'Synthetic arithmetic fixture', freightEvidence: evidence, customsEvidence: evidence }] };
const catalog = publicPriceCatalogSchema.parse({ version: 1, products: [record] });
const input = { sourceUrl, options: 'Blue / M', destination: 'JP', quantity: 1 };

describe('pre-login customer estimates', () => {
  it('validates the published file without supplying invented prices or rules', () => {
    expect(publicPriceCatalogSchema.safeParse(published).success).toBe(true);
  });
  it('sums every verified line and computes the approved fee automatically', () => {
    expect(publicCostEstimate(input, now, catalog)).toMatchObject({ priceSource: 'VERIFIED', productSubtotalKrw: 100000, serviceFeeKrw: 15000, productAndServiceKrw: 115000, totalKrw: 148500, expiresAt: new Date(evidence.expiresAt).toISOString() });
  });
  it('never substitutes a different variant or a cheaper quantity rate', () => {
    expect(publicCostEstimate({ ...input, options: 'Red / M' }, now, catalog).totalKrw).toBeNull();
    const two = publicCostEstimate({ ...input, quantity: 2 }, now, catalog);
    expect(two.productAndServiceKrw).toBe(230000);
    expect(two.totalKrw).toBeNull();
  });
  it('does not reuse another country’s tax or transport amounts', () => {
    for (const destination of ['US', 'CN', 'SG']) expect(publicCostEstimate({ ...input, destination }, now, catalog).totalKrw).toBeNull();
  });
  it('invalidates stale, future and unreasonably long-lived evidence', () => {
    for (const patch of [{ expiresAt: '2026-11-13T12:00:00Z' }, { verifiedAt: '2026-11-13T13:00:00Z' }, { expiresAt: '2026-12-01T00:00:00Z' }]) {
      const changed = structuredClone(catalog);
      Object.assign(changed.products[0].routes[0].customsEvidence, patch);
      expect(publicCostEstimate(input, now, changed).totalKrw).toBeNull();
    }
    expect(publicCostEstimate(input, now + 86400000, catalog).productSubtotalKrw).toBeNull();
  });
  it('labels customer input as unverified and leaves missing charges unknown', () => {
    const estimate = publicCostEstimate({ ...input, sourceUrl: 'https://www.yes24.com/product/goods/99', enteredUnitPriceKrw: 20000, quantity: 2 }, now, catalog);
    expect(estimate).toMatchObject({ priceSource: 'CUSTOMER', productSubtotalKrw: 40000, serviceFeeKrw: 10000, productAndServiceKrw: 50000, dutyKrw: null, taxKrw: null, totalKrw: null });
  });
  it('ignores a customer price override for a currently verified variant', () => {
    expect(publicCostEstimate({ ...input, enteredUnitPriceKrw: 1 }, now, catalog).productSubtotalKrw).toBe(100000);
  });
  it('rejects ambiguous entries and missing charges instead of choosing one or assuming zero', () => {
    expect(publicCostEstimate(input, now, { version: 1, products: [record, record] }).totalKrw).toBeNull();
    const invalid = structuredClone(record) as any;
    delete invalid.routes[0].taxKrw;
    expect(publicPriceCatalogSchema.safeParse({ version: 1, products: [invalid] }).success).toBe(false);
  });
  it.each([0, -1, 1.2, 11, NaN])('refuses invalid quantity %s', quantity => {
    expect(publicCostEstimate({ ...input, quantity }, now, catalog).serviceFeeKrw).toBeNull();
  });
});
