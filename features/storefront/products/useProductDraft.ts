'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getIntakeDraftStorage, saveIntakeDraft, type IntakeDraft } from '@/lib/purchases/intake-draft';
import { usePurchaseClient } from '@/components/purchases/PurchaseClient';
export function useProductDraft() {
  const router = useRouter(); const { href } = usePurchaseClient();
  const [error, setError] = useState('');
  function prepare(item: { sourceUrl: string; category: string; name: string }, destination: IntakeDraft['destination'] = '') {
    setError('');
    const saved = saveIntakeDraft(getIntakeDraftStorage(), { sourceUrl: item.sourceUrl,
      category: item.category as IntakeDraft['category'], quantity: 1, options: item.name, destination });
    if (!saved) { setError('Your browser could not save this draft. Copy the seller link into the product form.'); return; }
    router.push(href('/purchase'));
  }
  return { prepare, error };
}
