import { EMPTY_INTAKE_DRAFT, loadIntakeDraft, type DraftStorage, type IntakeDraft } from '@/lib/purchases/intake-draft';

// Read only the public, bounded product draft. Its normal loader removes invalid
// data, so keep that housekeeping inside an adapter that cannot change storage.
export function readPreviewEntryDraft(storage: Pick<DraftStorage, 'getItem'> | null, now = Date.now()): IntakeDraft {
  const readOnlyStorage: DraftStorage | null = storage ? {
    getItem: key => storage.getItem(key),
    setItem: () => {},
    removeItem: () => {},
  } : null;
  return { ...(loadIntakeDraft(readOnlyStorage, now) ?? EMPTY_INTAKE_DRAFT) };
}

// Used only by the explicit example button, never as the entry default.
export function previewBookExample(): IntakeDraft {
  return {
    sourceUrl: 'https://www.yes24.com/product/goods/13137546', category: 'books',
    quantity: 1, options: '', destination: 'SG',
  };
}
