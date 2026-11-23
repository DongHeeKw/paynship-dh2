import { z } from 'zod';

const ref = z.string().trim().min(1).max(200);
const time = z.string().datetime({ offset: true });
const money = z.number().int().min(0).max(1_000_000_000);
const positive = z.number().int().positive().max(1_000_000);
const evidence = z.object({ ref, validFrom: time, validUntil: time });

export const itemSchema = z.object({
  id: ref, orderId: ref, ownerId: ref, recipientRef: ref, addressRef: ref, country: ref,
  exactSku: ref, quantity: positive, origin: ref, declaredValueKrw: money,
  state: z.enum(['READY', 'EXPECTED', 'HOLD', 'BOOKED', 'DISPATCHED']),
  readyAt: time, dispatchBy: time, deliverBy: time, storageUntil: time,
});
export const packingSchema = z.object({
  itemIds: z.array(ref).min(1).max(4), measurementRef: ref,
  basis: z.enum(['MEASURED', 'ESTIMATED']),
  weightGrams: positive,
  dimensionsMm: z.tuple([positive, positive, positive]),
  compatible: z.boolean(), customerHandlingKrw: money, internalHandlingKrw: money,
  customerStoragePerItemDayKrw: money,
});
export const rateSchema = z.object({
  id: ref, service: ref, evidence, country: ref, addressRef: ref, hubId: ref,
  divisorCm3PerKg: positive, incrementGrams: positive, minimumGrams: positive,
  maxWeightGrams: positive, maxSideMm: positive, transitDays: z.number().int().min(0).max(120),
  brackets: z.array(z.object({ upToGrams: positive, baseKrw: money })).min(1).max(100),
  // All included charges must be explicit, including an evidenced zero.
  surchargesKrw: z.object({ fuel: money, remote: money, pickup: money, peak: money, insurance: money, ddp: money }),
});
const assessmentSchema = z.object({
  inputKey: z.string().min(1).max(100_000), evidence,
  validUntil: time, legal: z.boolean(), importerVerified: z.boolean(), ddp: z.boolean(),
  dutyKrw: money.nullable(), taxKrw: money.nullable(), clearanceKrw: money.nullable(),
});
export const compilerInputSchema = z.object({
  dataKind: z.enum(['SYNTHETIC_TEST_DATA', 'INTERNAL_SNAPSHOT']),
  nowIso: time, hubId: ref, requireDdp: z.boolean(), maxWaitDays: z.number().int().min(0).max(30),
  items: z.array(itemSchema).min(1).max(4),
  packings: z.array(packingSchema).max(15), rates: z.array(rateSchema).max(4),
  assessments: z.array(assessmentSchema).max(60),
});
export type CompilerInput = z.infer<typeof compilerInputSchema>;
export type OrderLine = z.infer<typeof itemSchema>;
export type Packing = z.infer<typeof packingSchema>;
export type Rate = z.infer<typeof rateSchema>;
export type Partition = string[][];
export const DAY_MS = 86_400_000;
export const groupKey = (ids: readonly string[]) => JSON.stringify([...ids].sort());

/** Canonical comparison key, NOT a signature or authorization token. Refs contain no raw PII. */
export function assessmentKey(input: CompilerInput, groups: Partition, rate: Rate): string {
  const canonicalGroups = [...groups].sort((a, b) => groupKey(a).localeCompare(groupKey(b)));
  return JSON.stringify({
    hubId: input.hubId, requireDdp: input.requireDdp,
    items: [...input.items].sort((a, b) => a.id.localeCompare(b.id)),
    groups: canonicalGroups.map((ids) => ({ ids: [...ids].sort(),
      packing: input.packings.find((packing) => groupKey(packing.itemIds) === groupKey(ids)) })),
    rate,
  });
}
export function currentEvidence(snapshot: z.infer<typeof evidence>, now: number): boolean {
  return Date.parse(snapshot.validFrom) <= now && now < Date.parse(snapshot.validUntil);
}
