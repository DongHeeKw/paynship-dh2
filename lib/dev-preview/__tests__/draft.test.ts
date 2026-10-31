import { describe, expect, it, vi } from 'vitest';
import { EMPTY_INTAKE_DRAFT, INTAKE_DRAFT_STORAGE_KEY, saveIntakeDraft, type IntakeDraft } from '@/lib/purchases/intake-draft';
import { previewBookExample, readPreviewEntryDraft } from '../draft';
import { previewSampleLabel } from '../sample-requests';

const now = Date.parse('2026-10-12T00:00:00Z');
const entered: IntakeDraft = {
  sourceUrl: 'https://brand.naver.com/kinox/products/5912828061?site_preference=device&NaPm=tracking',
  category: 'household', quantity: 3, options: 'Black, 24 cm', destination: 'TW',
};

function storageWith(raw: string | null) {
  return { getItem: vi.fn(() => raw), setItem: vi.fn(), removeItem: vi.fn() };
}

describe('preview entry draft', () => {
  it('uses the exact customer product selections instead of a preset book', () => {
    const raw = JSON.stringify({ version: 1, savedAt: now, draft: entered });
    const storage = storageWith(raw);
    const imported = readPreviewEntryDraft(storage, now);
    expect(imported).toEqual(entered);
    imported.options = 'Edited in preview';
    expect(readPreviewEntryDraft(storage, now)).toEqual(entered);
    expect(storage.getItem).toHaveBeenCalledWith(INTAKE_DRAFT_STORAGE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('starts with blank product fields when no public draft is available', () => {
    expect(readPreviewEntryDraft(null, now)).toEqual(EMPTY_INTAKE_DRAFT);
    expect(readPreviewEntryDraft(storageWith(null), now)).toEqual(EMPTY_INTAKE_DRAFT);
    const example = previewBookExample();
    expect(example.sourceUrl).toContain('yes24.com');
    example.sourceUrl = entered.sourceUrl;
    expect(previewBookExample().sourceUrl).toContain('yes24.com');
    expect(readPreviewEntryDraft(null, now).sourceUrl).toBe('');
  });

  it.each([
    'not JSON', 'x'.repeat(4097),
    JSON.stringify({ version: 1, savedAt: now - 24 * 60 * 60 * 1000, draft: entered }),
    JSON.stringify({ version: 1, savedAt: now + 1, draft: entered }),
    JSON.stringify({ version: 1, savedAt: now, draft: { ...entered, customsId: 'private' } }),
    JSON.stringify({ version: 1, savedAt: now, draft: { ...entered, quantity: 50_000 } }),
  ])('rejects invalid input without changing public storage (%#)', raw => {
    const storage = storageWith(raw);
    expect(readPreviewEntryDraft(storage, now)).toEqual(EMPTY_INTAKE_DRAFT);
    expect(storage.getItem()).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it('handles blocked storage without changing the draft or inventing a sample', () => {
    expect(readPreviewEntryDraft({ getItem: () => { throw new Error('Storage blocked'); } }, now)).toEqual(EMPTY_INTAKE_DRAFT);
  });

  it('accepts the same bounded draft produced by the public form', () => {
    let raw: string | null = null;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; }, removeItem: vi.fn() };
    expect(saveIntakeDraft(storage, entered, now)).toBe(true);
    const original = raw;
    expect(readPreviewEntryDraft(storage, now)).toEqual(entered);
    expect(raw).toBe(original);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});

describe('preview sample identity', () => {
  it('labels only preset sample IDs and keeps customer-created requests distinct', () => {
    expect(previewSampleLabel('11111111-1111-4111-8111-111111111111')).toBe('Preset example: book request');
    expect(previewSampleLabel('22222222-2222-4222-8222-222222222222')).toBe('Preset example: shipment');
    expect(previewSampleLabel(crypto.randomUUID())).toBeNull();
  });
});
