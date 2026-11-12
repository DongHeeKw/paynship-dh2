/** Exact, non-negative money arithmetic. Round once at each declared currency boundary. */
export function moneyInteger(value: number): bigint {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Money must be a non-negative safe integer.');
  return BigInt(value);
}

export function roundMoneyRatio(numerator: bigint, denominator: bigint): number {
  if (numerator < 0n || denominator <= 0n) throw new Error('Invalid monetary ratio.');
  const rounded = (numerator * 2n + denominator) / (2n * denominator);
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Money exceeds the supported range.');
  return Number(rounded);
}

export function decimalRatio(value: number | string): [bigint, bigint] {
  const match = /^(0|[1-9]\d{0,11})(?:\.(\d{1,8}))?$/.exec(String(value));
  if (!match) throw new Error('Use a non-negative decimal with at most eight decimal places.');
  const fraction = match[2] ?? '';
  return [BigInt(match[1] + fraction), 10n ** BigInt(fraction.length)];
}

export function decimalToMinor(value: string, decimalPlaces = 2): number {
  if (![0, 2].includes(decimalPlaces)) throw new Error('Unsupported currency precision.');
  const [numerator, denominator] = decimalRatio(value);
  return roundMoneyRatio(numerator * 10n ** BigInt(decimalPlaces), denominator);
}

export function krwToUsdCents(won: number, krwPerUsd: number): number {
  const [rate, scale] = decimalRatio(krwPerUsd);
  if (rate <= 0n) throw new Error('Exchange rate must be positive.');
  return roundMoneyRatio(moneyInteger(won) * 100n * scale, rate);
}

export function applyBasisPoints(amount: number, basisPoints: number): number {
  return roundMoneyRatio(moneyInteger(amount) * moneyInteger(basisPoints), 10000n);
}
