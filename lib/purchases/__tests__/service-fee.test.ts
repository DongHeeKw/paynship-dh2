import { describe, expect, it } from 'vitest';
import { allocateServiceFeeKrw, calculateServiceFeeKrw } from '../service-fee';
import { applyBasisPoints, decimalToMinor, krwToUsdCents, roundMoneyRatio } from '../money';

describe('approved retailer-order service fee', () => {
  it.each([[0, 0], [1, 0], [4, 1], [30000, 4500], [66666, 10000], [66670, 10001], [100000, 15000], [200000, 30000]])('charges %i won as %i won', (subtotal, fee) => {
    expect(calculateServiceFeeKrw(subtotal)).toBe(fee);
  });
  it.each([-1, 1.5, NaN, Infinity, 1000000001])('rejects invalid subtotals %s', subtotal => {
    expect(() => calculateServiceFeeKrw(subtotal)).toThrow();
  });
  it('charges 15% without a minimum and allocates exact won', () => {
    const result = allocateServiceFeeKrw([{ id: 'a', subtotalKrw: 10000 }, { id: 'b', subtotalKrw: 10000 }, { id: 'c', subtotalKrw: 10000 }]);
    expect(result).toEqual({ totalKrw: 4500, lines: [{ id: 'a', feeKrw: 1500 }, { id: 'b', feeKrw: 1500 }, { id: 'c', feeKrw: 1500 }] });
  });
  it('never loses a won across different order sizes and never allocates fees to free lines', () => {
    for (let count = 1; count <= 100; count++) {
      const lines = Array.from({ length: count }, (_, i) => ({ id: String(i), subtotalKrw: i * 713 }));
      const result = allocateServiceFeeKrw(lines);
      expect(result.lines.reduce((sum, line) => sum + line.feeKrw, 0)).toBe(result.totalKrw);
      expect(result.lines[0].feeKrw).toBe(0);
    }
  });
  it('rejects duplicate order lines instead of double counting them', () => {
    expect(() => allocateServiceFeeKrw([{ id: 'a', subtotalKrw: 1 }, { id: 'a', subtotalKrw: 2 }])).toThrow();
  });
});

describe('exact money arithmetic', () => {
  it('rounds decimal half-cent boundaries correctly without floating-point multiplication', () => {
    expect(decimalToMinor('1.005')).toBe(101);
    expect(decimalToMinor('2.675')).toBe(268);
    expect(applyBasisPoints(2500, 1050)).toBe(263);
    expect(krwToUsdCents(15000, 1400)).toBe(1071);
    expect(krwToUsdCents(10000, 1333.33)).toBe(750);
  });
  it('rejects invalid decimals and unsafe monetary results', () => {
    for (const value of ['NaN', '-1', '1e3', '1,000', '0.000000001']) expect(() => decimalToMinor(value)).toThrow();
    expect(() => roundMoneyRatio(10n ** 30n, 1n)).toThrow();
    expect(() => krwToUsdCents(10000, 0)).toThrow();
  });
});
