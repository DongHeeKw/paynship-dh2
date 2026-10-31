import { z } from 'zod';
import { PRODUCT_CATEGORIES } from './categories';
import { DESTINATIONS } from './countries';

export const INTAKE_DRAFT_STORAGE_KEY = 'paynship:intake-draft:v1';
export const PRODUCT_URL_STORAGE_KEY = 'paynship:product-url';
const MAX_STORAGE_BYTES = 4096;
const DRAFT_LIFETIME_MS = 24 * 60 * 60 * 1000;

const draftSchema = z.object({
  sourceUrl: z.string().max(2048),
  category: z.enum(PRODUCT_CATEGORIES),
  quantity: z.number().int().min(1).max(10),
  options: z.string().max(500),
  destination: z.union([z.enum(DESTINATIONS), z.literal('')]),
}).strict();

const storedDraftSchema = z.object({
  version: z.literal(1), savedAt: z.number().int().nonnegative(), draft: draftSchema,
}).strict();

export type IntakeDraft = z.infer<typeof draftSchema>;
export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const EMPTY_INTAKE_DRAFT: IntakeDraft = {
  sourceUrl: '', category: 'other', quantity: 1, options: '', destination: '',
};

export function getIntakeDraftStorage(): DraftStorage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export function loadIntakeDraft(storage: DraftStorage | null, now = Date.now()): IntakeDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(INTAKE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    if (new TextEncoder().encode(raw).byteLength > MAX_STORAGE_BYTES) {
      storage.removeItem(INTAKE_DRAFT_STORAGE_KEY);
      return null;
    }
    const parsed = storedDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.savedAt > now || now - parsed.data.savedAt >= DRAFT_LIFETIME_MS) {
      storage.removeItem(INTAKE_DRAFT_STORAGE_KEY);
      return null;
    }
    return parsed.data.draft;
  } catch { return null; }
}

export function saveIntakeDraft(storage: DraftStorage | null, draft: IntakeDraft, now = Date.now()): boolean {
  if (!storage) return false;
  try {
    const parsed = draftSchema.safeParse(draft);
    if (!parsed.success) return false;
    const raw = JSON.stringify({ version: 1, savedAt: now, draft: parsed.data });
    if (new TextEncoder().encode(raw).byteLength > MAX_STORAGE_BYTES) return false;
    storage.setItem(INTAKE_DRAFT_STORAGE_KEY, raw);
    return true;
  } catch { return false; }
}

export function clearIntakeDraft(storage: DraftStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(INTAKE_DRAFT_STORAGE_KEY);
    storage.removeItem(PRODUCT_URL_STORAGE_KEY);
  } catch {}
}
