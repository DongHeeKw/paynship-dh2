import { describe, expect, it } from 'vitest';
import { clearIntakeDraft, EMPTY_INTAKE_DRAFT, INTAKE_DRAFT_STORAGE_KEY, loadIntakeDraft, PRODUCT_URL_STORAGE_KEY, saveIntakeDraft, type DraftStorage, type IntakeDraft } from '../intake-draft';

function memoryStorage(): DraftStorage {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
  };
}

const now = Date.parse('2026-10-12T00:00:00Z');
const draft: IntakeDraft = {
  sourceUrl: 'https://www.yes24.com/product/goods/13137546',
  category: 'books', quantity: 2, options: 'Paperback', destination: 'TW',
};

describe('pre-login product draft persistence', () => {
  it('preserves all product selections through a same-tab login return', () => {
    const storage = memoryStorage();
    expect(saveIntakeDraft(storage, draft, now)).toBe(true);
    expect(loadIntakeDraft(storage, now + 60_000)).toEqual(draft);
  });

  it('expires drafts after 24 hours and rejects future timestamps', () => {
    const storage = memoryStorage();
    saveIntakeDraft(storage, draft, now);
    expect(loadIntakeDraft(storage, now + 24 * 60 * 60 * 1000)).toBeNull();
    expect(storage.getItem(INTAKE_DRAFT_STORAGE_KEY)).toBeNull();
    saveIntakeDraft(storage, draft, now + 1);
    expect(loadIntakeDraft(storage, now)).toBeNull();
  });

  it('rejects unexpected private fields and tampered quantity or country values', () => {
    const storage = memoryStorage();
    for (const extra of [{ address1: 'Private street' }, { customsId: '1234' }, { quantity: 50_000 }, { destination: 'ZZ' }]) {
      storage.setItem(INTAKE_DRAFT_STORAGE_KEY, JSON.stringify({ version: 1, savedAt: now, draft: { ...draft, ...extra } }));
      expect(loadIntakeDraft(storage, now)).toBeNull();
    }
  });

  it('bounds persisted data by UTF-8 bytes and validates each input limit', () => {
    const storage = memoryStorage();
    expect(saveIntakeDraft(storage, { ...draft, sourceUrl: '가'.repeat(2048) }, now)).toBe(false);
    expect(saveIntakeDraft(storage, { ...draft, options: 'x'.repeat(501) }, now)).toBe(false);
    expect(saveIntakeDraft(storage, { ...draft, quantity: 0 }, now)).toBe(false);
    storage.setItem(INTAKE_DRAFT_STORAGE_KEY, 'x'.repeat(4097));
    expect(loadIntakeDraft(storage, now)).toBeNull();
  });

  it('handles unavailable browser storage without issuing a false success', () => {
    const blocked: DraftStorage = {
      getItem: () => { throw new Error('Storage unavailable'); },
      setItem: () => { throw new Error('Storage unavailable'); },
      removeItem: () => { throw new Error('Storage unavailable'); },
    };
    expect(loadIntakeDraft(blocked, now)).toBeNull();
    expect(saveIntakeDraft(blocked, draft, now)).toBe(false);
    expect(saveIntakeDraft(null, EMPTY_INTAKE_DRAFT, now)).toBe(false);
    expect(() => clearIntakeDraft(blocked)).not.toThrow();
  });

  it('clears both current and legacy product drafts after real submission', () => {
    const storage = memoryStorage();
    saveIntakeDraft(storage, draft, now);
    storage.setItem(PRODUCT_URL_STORAGE_KEY, draft.sourceUrl);
    clearIntakeDraft(storage);
    expect(storage.getItem(INTAKE_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(PRODUCT_URL_STORAGE_KEY)).toBeNull();
  });
});
