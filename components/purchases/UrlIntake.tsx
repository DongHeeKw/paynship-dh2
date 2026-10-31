'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { EMPTY_INTAKE_DRAFT, getIntakeDraftStorage, loadIntakeDraft, saveIntakeDraft } from '@/lib/purchases/intake-draft';
export { PRODUCT_URL_STORAGE_KEY } from '@/lib/purchases/intake-draft';
export default function UrlIntake() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
      const storage = getIntakeDraftStorage();
      const draft = loadIntakeDraft(storage) ?? EMPTY_INTAKE_DRAFT;
      if (!saveIntakeDraft(storage, { ...draft, sourceUrl: parsed.toString() })) {
        setError('Your browser could not keep this product draft. Enable session storage to continue.');
        return;
      }
      router.push('/purchase');
    } catch { setError('Enter a complete HTTPS product link.'); }
  }
  return <><form className="url-form" onSubmit={submit}><label htmlFor="product-url" className="sr-only">Product link</label><input id="product-url" type="url" autoComplete="url" maxLength={2048} required placeholder="https://store.com/product" value={url} onChange={event => setUrl(event.target.value)} /><button className="primary-button" type="submit">Continue <span aria-hidden="true" className="ml-4">↗</span></button></form>{error && <p className="error-message" role="alert">{error}</p>}</>;
}
