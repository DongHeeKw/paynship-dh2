import { prisma } from '@/lib/db/prisma';
import { purchaseTransaction } from '@/lib/purchases/transaction';
import { PurchaseError } from '@/lib/purchases/errors';
import { operationalSettingsSchema, getOperationalSettings } from './operational-settings';

const projection = { id: true, maintenanceMode: true, shopifyEnabled: true, updatedAt: true } as const;

export async function readOperationalSettings() {
  const row = await prisma.adminSettings.findFirst({ select: projection });
  if (!row) throw new PurchaseError(503, 'An administrator must initialize service settings.');
  return row;
}

export async function saveOperationalSettings(actorId: string, input: unknown) {
  const data = operationalSettingsSchema.parse(input);
  return purchaseTransaction(async tx => {
    const before = await tx.adminSettings.findFirst({ select: projection });
    if (!before) throw new PurchaseError(503, 'An administrator must initialize service settings.');
    const changed = await tx.adminSettings.updateMany({ where: { id: before.id, updatedAt: before.updatedAt }, data });
    if (!changed.count) throw new PurchaseError(409, 'Settings changed. Refresh before saving.');
    const after = await tx.adminSettings.findUniqueOrThrow({ where: { id: before.id }, select: projection });
    await tx.adminAuditLog.create({ data: { adminUserId: actorId, action: 'UPDATE_OPERATIONAL_SETTINGS', target: 'admin_settings', targetId: before.id,
      changes: { before: getOperationalSettings(before), after: getOperationalSettings(after) } } });
    return after;
  });
}
