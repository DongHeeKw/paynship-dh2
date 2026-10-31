import { z } from 'zod';
import { PRODUCT_CATEGORIES } from './categories';
export { deliveryProfileSchema } from '@/lib/customs/delivery-schema';
export type { DeliveryProfile } from '@/lib/customs/delivery-schema';

export const createPurchaseSchema = z.object({
  sourceUrl: z.string().trim().min(1).max(2048),
  category: z.enum(PRODUCT_CATEGORIES),
  quantity: z.number().int().min(1).max(10),
  options: z.string().trim().max(500).default(''),
  idempotencyKey: z.string().uuid(),
}).strict();

export const supportSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
}).strict();
