import { z } from 'zod';
import { deliveryProfileSchema } from '@/lib/purchases/schemas';
import { openDeveloperWorkspace } from './sqlite-store.mjs';
import type { WorkspaceData } from './types';
export { WorkspaceError } from './sqlite-store.mjs';

const customerId = z.enum(['sample-customer-cn', 'sample-customer-jp', 'sample-customer-us']);
const base = { customerId, idempotencyKey: z.string().uuid() };
const request = { requestId: z.string().uuid(), version: z.number().int().nonnegative() };
export const workspaceActionSchema = z.discriminatedUnion('action', [
  z.object({ ...base, action: z.literal('top_up'), amountCents: z.number().int().min(100).max(100000) }).strict(),
  z.object({ ...base, ...request, action: z.literal('pay') }).strict(),
  z.object({ ...base, ...request, action: z.literal('advance_delivery') }).strict(),
  z.object({ ...base, action: z.literal('create_sample_request'), productId: z.string().regex(/^sample-naver-[a-z-]+$/) }).strict(),
  z.object({ ...base, action: z.literal('support'), requestId: request.requestId, subject: z.string().trim().min(3).max(120), message: z.string().trim().min(10).max(2000) }).strict(),
  z.object({ ...base, action: z.literal('save_delivery'), delivery: deliveryProfileSchema }).strict(),
  z.object({ ...base, ...request, action: z.literal('cancel_request') }).strict(),
]);

export function getWorkspace(id?: string): WorkspaceData {
  const selected = customerId.parse(id ?? 'sample-customer-jp');
  const store = openDeveloperWorkspace();
  try { return store.getWorkspace(selected) as WorkspaceData; }
  finally { store.close(); }
}

export function applyWorkspaceAction(input: unknown): WorkspaceData {
  const action = workspaceActionSchema.parse(input);
  const store = openDeveloperWorkspace();
  try { return store.applyAction(action) as WorkspaceData; }
  finally { store.close(); }
}
