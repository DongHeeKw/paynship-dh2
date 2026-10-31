/**
 * Currency Conversion Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  krwToUsdSync,
  usdToKrwSync,
  roundTo2Decimals,
  calculateItemTotalKrw,
  calculateItemTotalUsd,
  calculateCartSubtotals,
  type CartItemPrice,
} from '../currency';

// Mock exchange-rate module
vi.mock('../exchange-rate', () => ({
  getExchangeRateSync: vi.fn(() => 1400),
  getExchangeRate: vi.fn(() => Promise.resolve(1400)),
}));

describe('Currency Conversion', () => {
  describe('krwToUsdSync', () => {
    it('converts KRW to USD with default rate', () => {
      expect(krwToUsdSync(14000)).toBe(10);
      expect(krwToUsdSync(25000)).toBe(17.86);
      expect(krwToUsdSync(0)).toBe(0);
    });

    it('converts with custom exchange rate', () => {
      expect(krwToUsdSync(15000, 1500)).toBe(10);
      expect(krwToUsdSync(12000, 1200)).toBe(10);
    });

    it('rounds to 2 decimal places', () => {
      expect(krwToUsdSync(12345, 1400)).toBe(8.82);
      expect(krwToUsdSync(33333, 1400)).toBe(23.81);
    });
  });

  describe('usdToKrwSync', () => {
    it('converts USD to KRW with default rate', () => {
      expect(usdToKrwSync(10)).toBe(14000);
      expect(usdToKrwSync(17.86)).toBe(25004);
      expect(usdToKrwSync(0)).toBe(0);
    });

    it('converts with custom exchange rate', () => {
      expect(usdToKrwSync(10, 1500)).toBe(15000);
      expect(usdToKrwSync(100, 1200)).toBe(120000);
    });

    it('rounds to nearest integer', () => {
      expect(usdToKrwSync(10.5, 1400)).toBe(14700);
      expect(usdToKrwSync(10.999, 1400)).toBe(15399);
    });
  });

  describe('roundTo2Decimals', () => {
    it('rounds correctly', () => {
      expect(roundTo2Decimals(10.123)).toBe(10.12);
      expect(roundTo2Decimals(10.125)).toBe(10.13); // Standard rounding
      expect(roundTo2Decimals(10.1)).toBe(10.1);
      expect(roundTo2Decimals(10)).toBe(10);
    });
  });

  describe('calculateItemTotalKrw', () => {
    it('calculates basic item total', () => {
      const item: CartItemPrice = { priceKrw: 10000, quantity: 2 };
      expect(calculateItemTotalKrw(item)).toBe(20000);
    });

    it('includes option price adjustment', () => {
      const item: CartItemPrice = {
        priceKrw: 10000,
        optionPriceAdjustment: 5000,
        quantity: 2,
      };
      expect(calculateItemTotalKrw(item)).toBe(30000);
    });

    it('handles zero quantity', () => {
      const item: CartItemPrice = { priceKrw: 10000, quantity: 0 };
      expect(calculateItemTotalKrw(item)).toBe(0);
    });

    it('handles negative option adjustment', () => {
      const item: CartItemPrice = {
        priceKrw: 10000,
        optionPriceAdjustment: -2000,
        quantity: 1,
      };
      expect(calculateItemTotalKrw(item)).toBe(8000);
    });
  });

  describe('calculateItemTotalUsd', () => {
    it('converts item total to USD', () => {
      const item: CartItemPrice = { priceKrw: 14000, quantity: 1 };
      expect(calculateItemTotalUsd(item)).toBe(10);
    });

    it('uses custom exchange rate', () => {
      const item: CartItemPrice = { priceKrw: 15000, quantity: 1 };
      expect(calculateItemTotalUsd(item, 1500)).toBe(10);
    });
  });

  describe('calculateCartSubtotals', () => {
    it('calculates empty cart', () => {
      const result = calculateCartSubtotals([]);
      expect(result).toEqual({
        subtotalKrw: 0,
        subtotalUsd: 0,
        itemCount: 0,
      });
    });

    it('calculates single item cart', () => {
      const items: CartItemPrice[] = [{ priceKrw: 14000, quantity: 2 }];
      const result = calculateCartSubtotals(items);
      expect(result).toEqual({
        subtotalKrw: 28000,
        subtotalUsd: 20,
        itemCount: 2,
      });
    });

    it('calculates multiple items with options', () => {
      const items: CartItemPrice[] = [
        { priceKrw: 14000, quantity: 1 },
        { priceKrw: 10000, optionPriceAdjustment: 4000, quantity: 2 },
      ];
      const result = calculateCartSubtotals(items);
      expect(result).toEqual({
        subtotalKrw: 42000, // 14000 + (10000 + 4000) * 2
        subtotalUsd: 30,
        itemCount: 3,
      });
    });

    it('uses custom exchange rate', () => {
      const items: CartItemPrice[] = [{ priceKrw: 15000, quantity: 1 }];
      const result = calculateCartSubtotals(items, 1500);
      expect(result).toEqual({
        subtotalKrw: 15000,
        subtotalUsd: 10,
        itemCount: 1,
      });
    });
  });
});
