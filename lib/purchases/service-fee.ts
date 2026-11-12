import { applyBasisPoints, moneyInteger } from './money';

export const SERVICE_FEE_POLICY = Object.freeze({
  id: 'retailer-order-15pct-min10000krw-v1',
  basisPoints: 1500,
  minimumKrw: 10000,
  effectiveDate: '2026-11-13',
});

/** One retailer checkout, including all quantities; never apply the minimum per unit. */
export function calculateServiceFeeKrw(productSubtotalKrw: number): number {
  moneyInteger(productSubtotalKrw);
  if (productSubtotalKrw > 1_000_000_000) throw new Error('Product subtotal exceeds the service limit.');
  if (productSubtotalKrw === 0) return 0;
  return Math.max(SERVICE_FEE_POLICY.minimumKrw, applyBasisPoints(productSubtotalKrw, SERVICE_FEE_POLICY.basisPoints));
}

/** Allocate a single retailer-order fee across its lines without losing a won. */
export function allocateServiceFeeKrw(lines: readonly { id: string; subtotalKrw: number }[]) {
  if (!lines.length || lines.length > 100 || new Set(lines.map(line => line.id)).size !== lines.length) throw new Error('Provide 1–100 unique product lines.');
  const subtotal = lines.reduce((sum, line) => sum + moneyInteger(line.subtotalKrw), 0n);
  if (subtotal > 1_000_000_000n) throw new Error('Product subtotal exceeds the service limit.');
  const total = calculateServiceFeeKrw(Number(subtotal));
  if (subtotal === 0n) return { totalKrw: 0, lines: lines.map(line => ({ id: line.id, feeKrw: 0 })) };
  const allocated = lines.map((line, index) => {
    const numerator = BigInt(total) * BigInt(line.subtotalKrw);
    return { id: line.id, index, feeKrw: Number(numerator / subtotal), remainder: numerator % subtotal };
  });
  let remaining = total - allocated.reduce((sum, line) => sum + line.feeKrw, 0);
  const ranked = [...allocated].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (const line of ranked) { if (remaining-- <= 0) break; line.feeKrw++; }
  return { totalKrw: total, lines: allocated.map(({ id, feeKrw }) => ({ id, feeKrw })) };
}
