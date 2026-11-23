/** Fictional teaching fixtures. Never import into checkout, persistence or live quote adapters. */
import { assessmentKey, compilerInputSchema, DAY_MS, groupKey, type CompilerInput, type OrderLine } from './contracts';
import { enumeratePartitions } from './partitions';

export const scenarios = {
  wait: '3일 기다려 함께 배송', all: '모두 입고 완료', partial: '늦는 상품은 따로 배송',
  bulky: '큰 박스 실측 후 재계산', missing: '통관 근거 미확인', expired: '운임 유효기간 만료',
} as const;
export type Scenario = keyof typeof scenarios;
const NOW = '2026-11-22T00:00:00.000Z';
const day = (days: number) => new Date(Date.parse(NOW) + days * DAY_MS).toISOString();

export function createScenario(scenario: Scenario): CompilerInput {
  const item = (id: string, days: number): OrderLine => ({
    id, orderId: `PN-${id}`, ownerId: 'sample-owner', recipientRef: 'sample-recipient', addressRef: 'sample-address', country: 'JP',
    exactSku: `SAMPLE-${id}-IVORY-M`, quantity: 1, origin: 'KR', declaredValueKrw: 20000,
    state: days ? 'EXPECTED' : 'READY', readyAt: day(days), dispatchBy: day(days + 5),
    deliverBy: day(days + 10), storageUntil: day(days + 7),
  });
  const items = [item('A', 0), item('B', scenario === 'wait' || scenario === 'missing' || scenario === 'expired' ? 3 : 0)];
  if (scenario === 'partial') items.push(item('C', 8));
  const groups = [...new Map(enumeratePartitions(items.map((entry) => entry.id))
    .flat().map((ids) => [groupKey(ids), ids])).values()];
  const input = compilerInputSchema.parse({
    dataKind: 'SYNTHETIC_TEST_DATA', nowIso: NOW, hubId: 'HUB_HOME_01', requireDdp: true, maxWaitDays: 5, items,
    packings: groups.map((ids) => ({ itemIds: ids, measurementRef: `synthetic-packing-${groupKey(ids)}`,
      basis: 'MEASURED', weightGrams: ids.length * 800,
      dimensionsMm: scenario === 'bulky' && ids.length > 1 ? [500, 400, 400] : [200, 150, 100],
      compatible: true, customerHandlingKrw: 1000, internalHandlingKrw: ids.length > 1 ? 3000 : 2000,
      customerStoragePerItemDayKrw: 0,
    })),
    rates: [{ id: 'sample-rate-v1', service: 'SYNTHETIC_STANDARD', country: 'JP', addressRef: 'sample-address', hubId: 'HUB_HOME_01',
      evidence: { ref: 'synthetic-contract-v1', validFrom: day(-1), validUntil: day(scenario === 'expired' ? 0 : 30) },
      divisorCm3PerKg: 5000, incrementGrams: 500, minimumGrams: 1000, maxWeightGrams: 20000, maxSideMm: 1000, transitDays: 3,
      brackets: [{ upToGrams: 1000, baseKrw: 12000 }, { upToGrams: 2000, baseKrw: 18000 },
        { upToGrams: 5000, baseKrw: 30000 }, { upToGrams: 20000, baseKrw: 50000 }],
      surchargesKrw: { fuel: 1000, remote: 0, pickup: 0, peak: 0, insurance: 0, ddp: 0 },
    }], assessments: [],
  });
  if (scenario !== 'missing') {
    // These are artificial test approvals, never broker-approved Golden Vectors.
    input.assessments = enumeratePartitions(items.map((entry) => entry.id)).flatMap((partition) => input.rates.map((rate) => ({
      inputKey: assessmentKey(input, partition, rate), evidence: { ref: `synthetic-assessment-${JSON.stringify(partition)}`, validFrom: day(-1), validUntil: day(20) },
      validUntil: day(20), legal: true, importerVerified: true, ddp: true,
      dutyKrw: 1000 * items.length, taxKrw: 1000 * items.length, clearanceKrw: 1000 * items.length,
    })));
  }
  return input;
}
