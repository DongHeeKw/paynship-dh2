import { describe, expect, it } from 'vitest';
import { compileConsolidation } from '../compile';
import { enumeratePartitions } from '../partitions';
import { ratePackage } from '../rate';
import { createScenario } from '../fixtures';
import { assessmentKey } from '../contracts';

describe('HOME_HUB generated shipping plans (synthetic evidence only)', () => {
  it('enumerates every partition without duplicate or missing items, independently of input order', () => {
    const partitions = enumeratePartitions(['D', 'B', 'A', 'C']);
    expect(partitions).toHaveLength(15);
    expect(new Set(partitions.map((partition) => JSON.stringify(partition))).size).toBe(15);
    for (const groups of partitions) expect(groups.flat().sort()).toEqual(['A', 'B', 'C', 'D']);
    expect(partitions).toEqual(enumeratePartitions(['A', 'B', 'C', 'D']));
    expect(() => enumeratePartitions(['A', 'A'])).toThrow();
    expect(() => enumeratePartitions(['A', 'B', 'C', 'D', 'E'])).toThrow();
  });

  it('generates the 34,000 vs 26,000 comparison and explains the three-day wait', () => {
    const result = compileConsolidation(createScenario('wait'));
    expect(result.decision).toMatchObject({ status: 'RECOMMENDED', recommendedKind: 'WAIT',
      baselineCustomerTotalKrw: 34000, selectedCustomerTotalKrw: 26000,
      estimatedCustomerSavingsKrw: 8000, extraWaitDays: 3, customerConsentRequired: true });
    expect(result.executionAllowed).toBe(false);
    expect(result.dataKind).toBe('SYNTHETIC_TEST_DATA');
    expect(result.evaluations).toHaveLength(2);
  });

  it.each([['all', 'ALL'], ['partial', 'PARTIAL'], ['bulky', 'SEPARATE']] as const)(
    '%s chooses %s from generated alternatives', (scenario, kind) => {
      expect(compileConsolidation(createScenario(scenario)).decision).toMatchObject({
        status: 'RECOMMENDED', recommendedKind: kind,
      });
    });

  it.each(['missing', 'expired'] as const)('%s evidence cannot become a saving', (scenario) => {
    expect(compileConsolidation(createScenario(scenario)).decision.status).toBe('REVIEW_REQUIRED');
  });

  it.each(['ownerId', 'recipientRef', 'addressRef', 'country'] as const)('never mixes a different %s', (field) => {
    const input = createScenario('wait');
    input.items[1][field] = 'other';
    expect(compileConsolidation(input).decision).toMatchObject({ status: 'REVIEW_REQUIRED', reasons: ['RECIPIENT_MISMATCH'] });
  });

  it('rejects changed SKU, quantity or measurement against the old evidence', () => {
    for (const change of [
      (input: ReturnType<typeof createScenario>) => { input.items[0].quantity++; },
      (input: ReturnType<typeof createScenario>) => { input.items[0].exactSku = 'different-size'; },
      (input: ReturnType<typeof createScenario>) => { input.packings[0].weightGrams++; },
    ]) {
      const input = createScenario('wait'); change(input);
      expect(compileConsolidation(input).decision.status).toBe('REVIEW_REQUIRED');
    }
  });

  it('requires whole-plan legal/importer/DDP approval, not just cheap carrier prices', () => {
    for (const field of ['legal', 'importerVerified', 'ddp'] as const) {
      const input = createScenario('wait');
      input.assessments.forEach((entry) => { entry[field] = false; });
      expect(compileConsolidation(input).decision.status).toBe('REVIEW_REQUIRED');
    }
  });

  it('treats unknown charges as unknown, not zero', () => {
    const input = createScenario('wait'); input.assessments.forEach((entry) => { entry.dutyKrw = null; });
    expect(compileConsolidation(input).decision.status).toBe('REVIEW_REQUIRED');
  });

  it('requires fresh assessment at its exact expiry boundary', () => {
    const input = createScenario('wait'); input.nowIso = input.assessments[0].validUntil;
    expect(compileConsolidation(input).decision.status).toBe('REVIEW_REQUIRED');
  });

  it('rejects duplicate items, held inventory, oversized inputs and malformed numbers', () => {
    for (const change of [
      (input: ReturnType<typeof createScenario>) => { input.items.push(input.items[0]); },
      (input: ReturnType<typeof createScenario>) => { input.items[0].state = 'HOLD'; },
      (input: ReturnType<typeof createScenario>) => { input.items[0].quantity = NaN; },
      (input: ReturnType<typeof createScenario>) => { input.rates[0].surchargesKrw.fuel = -1; },
    ]) {
      const input = createScenario('wait'); change(input);
      expect(compileConsolidation(input).decision.status).toBe('REVIEW_REQUIRED');
    }
  });

  it('is deterministic and does not mutate inputs', () => {
    const input = createScenario('partial'); const before = JSON.stringify(input);
    const first = compileConsolidation(input);
    input.items.reverse(); input.packings.reverse(); input.assessments.reverse();
    expect(compileConsolidation(input)).toEqual(first);
    input.items.reverse(); input.packings.reverse(); input.assessments.reverse();
    expect(JSON.stringify(input)).toBe(before);
  });

  it('rejects full consolidation past the first item deadline while retaining partial shipping', () => {
    const result = compileConsolidation(createScenario('partial'));
    const all = result.evaluations.find((entry) => entry.groups.length === 1)!;
    expect(all.reasons).toEqual(expect.arrayContaining(['DELIVERY_DEADLINE', 'STORAGE_LIMIT', 'WAIT_LIMIT']));
    expect(all.customerTotalKrw).toBeNull();
  });

  it.each([
    ['WAIT_LIMIT', (input: ReturnType<typeof createScenario>) => { input.maxWaitDays = 2; }],
    ['STORAGE_LIMIT', (input: ReturnType<typeof createScenario>) => { input.items[0].storageUntil = input.nowIso; }],
    ['INCOMPATIBLE_ITEMS', (input: ReturnType<typeof createScenario>) => { input.packings.find((p) => p.itemIds.length === 2)!.compatible = false; }],
    ['PACKING_NOT_MEASURED', (input: ReturnType<typeof createScenario>) => { input.packings.find((p) => p.itemIds.length === 2)!.basis = 'ESTIMATED'; }],
  ] as const)('enforces %s even with matching synthetic trade evidence', (reason, change) => {
    const input = createScenario('wait'); change(input);
    input.assessments = enumeratePartitions(input.items.map((item) => item.id)).map((groups) => ({
      ...input.assessments[0], inputKey: assessmentKey(input, groups, input.rates[0]),
    }));
    const result = compileConsolidation(input);
    expect(result.evaluations.find((entry) => entry.kind === 'WAIT')!.reasons).toContain(reason);
    expect(result.decision).toMatchObject({ recommendedKind: 'SEPARATE' });
  });

  it('compares complete service costs including surcharges, and chooses the cheapest baseline too', () => {
    const input = createScenario('wait');
    const expensive = structuredClone(input.rates[0]); expensive.id = 'cheap-base-expensive-total';
    expensive.brackets.forEach((bracket) => { bracket.baseKrw = 100; }); expensive.surchargesKrw.remote = 50000;
    input.rates.push(expensive);
    input.assessments = enumeratePartitions(input.items.map((item) => item.id)).flatMap((groups) => input.rates.map((rate) => ({
      ...input.assessments[0], inputKey: assessmentKey(input, groups, rate),
    })));
    expect(compileConsolidation(input).decision).toMatchObject({ baselineCustomerTotalKrw: 34000, selectedCustomerTotalKrw: 26000 });
  });

  it('uses service dimensional divisor, rounding, minimum and surcharges', () => {
    const input = createScenario('wait');
    const packing = { ...input.packings[0], weightGrams: 400, dimensionsMm: [310, 200, 100] as [number, number, number] };
    expect(ratePackage(packing, input.rates[0])).toMatchObject({ billableWeightGrams: 1500, freightKrw: 18000, surchargesKrw: 1000 });
    expect(ratePackage(packing, { ...input.rates[0], divisorCm3PerKg: 10000 })).toMatchObject({ billableWeightGrams: 1000, freightKrw: 12000 });
    expect(ratePackage(packing, { ...input.rates[0], maxWeightGrams: 1000 })).toBeNull();
  });
});
