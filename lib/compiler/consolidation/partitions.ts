import type { Partition } from './contracts';

/** Enumerate Bell(n) groupings, bounded at n=4 (15 plans). Never split an order line's quantity. */
export function enumeratePartitions(ids: readonly string[]): Partition[] {
  if (ids.length < 1 || ids.length > 4 || new Set(ids).size !== ids.length) {
    throw new Error('Expected one to four distinct order lines');
  }
  let partitions: Partition[] = [[]];
  for (const id of [...ids].sort()) {
    partitions = partitions.flatMap((groups) => [
      [...groups.map((group) => [...group]), [id]],
      ...groups.map((_, index) => groups.map((group, i) => i === index ? [...group, id] : [...group])),
    ]);
  }
  return partitions;
}
