import { packingSchema, rateSchema, type Packing, type Rate } from './contracts';

/** Millimetres and grams cancel the cm³/kg factors. BigInt avoids underbilling at boundaries. */
export function ratePackage(packing: Packing, rate: Rate) {
  if (!packingSchema.safeParse(packing).success || !rateSchema.safeParse(rate).success) return null;
  if (packing.dimensionsMm.some((side) => side > rate.maxSideMm)) return null;
  const volume = packing.dimensionsMm.reduce((value, side) => value * BigInt(side), 1n);
  const divisor = BigInt(rate.divisorCm3PerKg);
  const volumetricWeightGrams = Number((volume + divisor - 1n) / divisor);
  const chargeable = BigInt(Math.max(packing.weightGrams, volumetricWeightGrams, rate.minimumGrams));
  const step = BigInt(rate.incrementGrams);
  const billableWeightGrams = Number(((chargeable + step - 1n) / step) * step);
  if (!Number.isSafeInteger(billableWeightGrams) || billableWeightGrams > rate.maxWeightGrams) return null;
  const brackets = [...rate.brackets].sort((a, b) => a.upToGrams - b.upToGrams);
  if (new Set(brackets.map((bracket) => bracket.upToGrams)).size !== brackets.length) return null;
  const bracket = brackets.find((entry) => billableWeightGrams <= entry.upToGrams);
  if (!bracket) return null;
  return { actualWeightGrams: packing.weightGrams, volumetricWeightGrams, billableWeightGrams,
    freightKrw: bracket.baseKrw, surchargesKrw: Object.values(rate.surchargesKrw).reduce((a, b) => a + b, 0) };
}
