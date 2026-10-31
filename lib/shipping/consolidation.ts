/**
 * Package Consolidation — group multiple orders into one shipment.
 *
 * Validates that all orders share the same destination country,
 * assigns a shared consolidationGroupId, and computes combined weight/dims.
 */

import { prisma } from '@/lib/db/prisma';
import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface ConsolidationGroup {
  groupId: string;
  orderIds: string[];
  destinationCountry: string;
  combinedWeightKg: number;
  combinedDimensions: {
    totalVolumeL: number;
    estimatedBoxL: number;
    estimatedBoxW: number;
    estimatedBoxH: number;
  };
  orders: ConsolidationOrderSummary[];
}

export interface ConsolidationOrderSummary {
  id: string;
  status: string;
  actualWeightKg: number | null;
  chargeableWeightKg: number | null;
  destinationCountry: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Estimate a consolidated box given individual order dimensions.
 * Uses simple cubic stacking model: total volume → cube root → pad by 20%.
 */
function estimateConsolidatedDimensions(
  orders: Array<{ actualDimensions: unknown; actualWeightKg: number | null }>
) {
  let totalVolumeL = 0;

  for (const order of orders) {
    const dims = order.actualDimensions as { l?: number; w?: number; h?: number } | null;
    if (dims?.l && dims?.w && dims?.h) {
      totalVolumeL += (dims.l * dims.w * dims.h) / 1000; // cm³ → L
    } else if (order.actualWeightKg) {
      // Rough estimate: 1 kg ≈ 2L for typical ecommerce packages
      totalVolumeL += order.actualWeightKg * 2;
    }
  }

  // Estimate box as cube with 20% packing overhead
  const paddedVolumeCm3 = totalVolumeL * 1000 * 1.2;
  const side = Math.ceil(Math.cbrt(paddedVolumeCm3));

  return {
    totalVolumeL: Math.round(totalVolumeL * 100) / 100,
    estimatedBoxL: side,
    estimatedBoxW: side,
    estimatedBoxH: side,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a consolidation group from a list of order IDs.
 *
 * Validates:
 * - All orders exist
 * - All orders share the same destination country
 * - None are already in a different consolidation group
 */
export async function createConsolidationGroup(
  orderIds: string[]
): Promise<ConsolidationGroup> {
  if (orderIds.length < 2) {
    throw new Error('Consolidation requires at least 2 orders');
  }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    select: {
      id: true,
      status: true,
      destinationCountry: true,
      actualWeightKg: true,
      actualDimensions: true,
      chargeableWeightKg: true,
      consolidationGroupId: true,
    },
  });

  // Validate all orders found
  if (orders.length !== orderIds.length) {
    const foundIds = new Set(orders.map((o) => o.id));
    const missing = orderIds.filter((id) => !foundIds.has(id));
    throw new Error(`Orders not found: ${missing.join(', ')}`);
  }

  // Validate same destination country
  const countries = [...new Set(orders.map((o) => o.destinationCountry).filter(Boolean))];
  if (countries.length === 0) {
    throw new Error('Orders have no destination country set');
  }
  if (countries.length > 1) {
    throw new Error(
      `All orders must share the same destination country. Found: ${countries.join(', ')}`
    );
  }

  // Validate not already in a different group
  const alreadyGrouped = orders.filter(
    (o) => o.consolidationGroupId && !orderIds.includes(o.consolidationGroupId)
  );
  if (alreadyGrouped.length > 0) {
    throw new Error(
      `Orders already in another consolidation group: ${alreadyGrouped.map((o) => o.id).join(', ')}`
    );
  }

  const destinationCountry = countries[0]!;
  const groupId = randomUUID();

  // Combined weight
  const combinedWeightKg = orders.reduce((sum, o) => sum + (o.actualWeightKg ?? 0), 0);
  const combinedDimensions = estimateConsolidatedDimensions(orders);

  // Assign group
  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: { consolidationGroupId: groupId },
  });

  return {
    groupId,
    orderIds,
    destinationCountry,
    combinedWeightKg: Math.round(combinedWeightKg * 100) / 100,
    combinedDimensions,
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      actualWeightKg: o.actualWeightKg,
      chargeableWeightKg: o.chargeableWeightKg,
      destinationCountry: o.destinationCountry,
    })),
  };
}

/**
 * Get all orders in a consolidation group.
 */
export async function getConsolidationGroup(
  groupId: string
): Promise<ConsolidationGroup | null> {
  const orders = await prisma.order.findMany({
    where: { consolidationGroupId: groupId },
    select: {
      id: true,
      status: true,
      destinationCountry: true,
      actualWeightKg: true,
      actualDimensions: true,
      chargeableWeightKg: true,
      consolidationGroupId: true,
    },
  });

  if (orders.length === 0) return null;

  const countries = [...new Set(orders.map((o) => o.destinationCountry).filter(Boolean))];
  const destinationCountry = countries[0] ?? 'unknown';

  const combinedWeightKg = orders.reduce((sum, o) => sum + (o.actualWeightKg ?? 0), 0);
  const combinedDimensions = estimateConsolidatedDimensions(orders);

  return {
    groupId,
    orderIds: orders.map((o) => o.id),
    destinationCountry,
    combinedWeightKg: Math.round(combinedWeightKg * 100) / 100,
    combinedDimensions,
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      actualWeightKg: o.actualWeightKg,
      chargeableWeightKg: o.chargeableWeightKg,
      destinationCountry: o.destinationCountry,
    })),
  };
}

/**
 * List all active consolidation groups (groups with 2+ orders).
 */
export async function listConsolidationGroups(): Promise<
  Array<{ groupId: string; orderCount: number; destinationCountry: string | null }>
> {
  const groups = await prisma.order.groupBy({
    by: ['consolidationGroupId'],
    where: { consolidationGroupId: { not: null } },
    _count: { id: true },
  });

  // Fetch one order per group to get destination country
  const groupIds = groups
    .map((g) => g.consolidationGroupId)
    .filter((id): id is string => id !== null);

  const representatives = await prisma.order.findMany({
    where: { consolidationGroupId: { in: groupIds } },
    distinct: ['consolidationGroupId'],
    select: { consolidationGroupId: true, destinationCountry: true },
  });

  const countryMap = new Map(
    representatives.map((r) => [r.consolidationGroupId, r.destinationCountry])
  );

  return groups
    .filter((g) => g.consolidationGroupId !== null)
    .map((g) => ({
      groupId: g.consolidationGroupId!,
      orderCount: g._count.id,
      destinationCountry: countryMap.get(g.consolidationGroupId!) ?? null,
    }));
}
