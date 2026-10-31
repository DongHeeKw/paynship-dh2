import { prisma } from '@/lib/db/prisma';
import { PurchaseError } from './errors';

export async function requirePurchasingAvailable(payment = false) {
  const settings = await prisma.adminSettings.findFirst({ select: { maintenanceMode: true, shopifyEnabled: true, useMockCheckout: true } });
  if (!settings) throw new PurchaseError(503, 'Service operations must be configured before accepting requests.');
  if (settings.maintenanceMode) throw new PurchaseError(503, 'New requests and payments are paused for maintenance.');
  if (payment && (!settings.shopifyEnabled || settings.useMockCheckout)) throw new PurchaseError(503, 'Verified hosted payment is not enabled.');
}
