import { z } from 'zod';

/** Only operational flags can be read or changed through the settings API. */
export const operationalSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  shopifyEnabled: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'At least one setting is required');

export function getOperationalSettings(settings: { maintenanceMode: boolean; shopifyEnabled: boolean }) {
  return {
    maintenanceMode: settings.maintenanceMode,
    shopifyEnabled: settings.shopifyEnabled,
  };
}
