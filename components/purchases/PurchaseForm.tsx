'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { RESTRICTED_CATEGORIES } from '@/lib/purchases/categories';
import { clearIntakeDraft, EMPTY_INTAKE_DRAFT, getIntakeDraftStorage, loadIntakeDraft, PRODUCT_URL_STORAGE_KEY, saveIntakeDraft, type IntakeDraft } from '@/lib/purchases/intake-draft';
import { getProductPreview } from '@/lib/purchases/product-preview';
import type { DeliveryProfile } from '@/lib/purchases/schemas';
import ProductRequestFields from './ProductRequestFields';
import ProductPreview from './ProductPreview';
import { usePurchaseClient } from './PurchaseClient';
import { countryName } from './labels';
export default function PurchaseForm() {
  const { user, loading: authLoading } = useAuth();
  const { request, navigate, href, preview, previewDraft } = usePurchaseClient();
  const signedIn = preview || Boolean(user);
  const [regularDraft, setRegularDraft] = useState<IntakeDraft>(EMPTY_INTAKE_DRAFT);
  const [regularRestored, setRegularRestored] = useState(false);
  const draft = preview ? previewDraft?.value ?? EMPTY_INTAKE_DRAFT : regularDraft;
  const setDraft = preview ? previewDraft?.update ?? setRegularDraft : setRegularDraft;
  const restored = preview ? Boolean(previewDraft?.ready) : regularRestored;
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idempotency = useRef<string | null>(null);

  useEffect(() => {
    if (preview) return;
    const storage = getIntakeDraftStorage();
    const saved = loadIntakeDraft(storage);
    if (saved) setRegularDraft(saved);
    else {
      try {
        const oldUrl = storage?.getItem(PRODUCT_URL_STORAGE_KEY);
        storage?.removeItem(PRODUCT_URL_STORAGE_KEY);
        if (oldUrl && oldUrl.length <= 2048) setRegularDraft({ ...EMPTY_INTAKE_DRAFT, sourceUrl: oldUrl });
      } catch {}
    }
    setRegularRestored(true);
  }, [preview]);

  useEffect(() => {
    if (restored && !preview) saveIntakeDraft(getIntakeDraftStorage(), draft);
  }, [draft, restored, preview]);

  useEffect(() => {
    if (!signedIn) { setProfile(null); setProfileLoading(false); return; }
    const controller = new AbortController();
    setProfileLoading(true);
    void request<{ profile: DeliveryProfile | null }>('/api/delivery-profile', { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        setProfile(data.profile);
        if (data.profile) setDraft(previous => previous.destination ? previous : { ...previous, destination: data.profile!.country });
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load delivery details.'); })
      .finally(() => { if (!controller.signal.aborted) setProfileLoading(false); });
    return () => controller.abort();
  }, [request, user, preview, signedIn, setDraft]);

  const product = getProductPreview(draft.sourceUrl);
  const restricted = RESTRICTED_CATEGORIES.includes(draft.category);
  const countryMismatch = Boolean(profile && draft.destination && profile.country !== draft.destination);
  const validDraft = product.state === 'SUPPORTED' && draft.destination && !restricted && Number.isInteger(draft.quantity) && draft.quantity >= 1 && draft.quantity <= 10;

  function edited(patch: Partial<IntakeDraft>) {
    idempotency.current = null; setError(''); setDraft(previous => ({ ...previous, ...patch }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !validDraft || product.state !== 'SUPPORTED') return;
    setError('');
    if (!signedIn) {
      if (!saveIntakeDraft(getIntakeDraftStorage(), { ...draft, sourceUrl: product.canonicalUrl })) {
        setError('Your browser could not keep this draft. Enable session storage before signing in.'); return;
      }
      navigate('/login?next=/purchase'); return;
    }
    if (!profile || countryMismatch || profileLoading) return;
    setBusy(true); idempotency.current ??= crypto.randomUUID();
    try {
      const data = await request<{ request: { id: string } }>('/api/purchases', {
        method: 'POST', body: JSON.stringify({ sourceUrl: product.canonicalUrl, category: draft.category, quantity: draft.quantity, options: draft.options, idempotencyKey: idempotency.current }),
      });
      if (!preview) clearIntakeDraft(getIntakeDraftStorage());
      navigate(`/orders/${data.request.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit request.'); } finally { setBusy(false); }
  }

  return <form className="form-stack" onSubmit={submit}>
    <fieldset className="form-stack" disabled={busy}><ProductRequestFields draft={draft} onChange={edited} /></fieldset>
    <ProductPreview draft={draft} product={product} />
    {signedIn && (profileLoading ? <p className="muted" role="status">Loading delivery details…</p> : profile ? <p className="notice">
      Delivering to {profile.fullName}, {profile.city}, {countryName(profile.country)}. <Link href={href('/settings/delivery?next=/purchase')}>Edit delivery details</Link>
    </p> : <p className="notice">Add your delivery details before submitting. <Link href={href('/settings/delivery?next=/purchase')}>Add delivery details</Link></p>)}
    {countryMismatch && <p className="notice" role="status">Your selected destination differs from your saved address. Update your delivery details or select {countryName(profile!.country)} before submitting.</p>}
    <p className="muted">{signedIn ? 'This submits one request for review. No payment or seller purchase takes place yet.' : 'Ready to save this request? Sign in next, then add your delivery details. Your product selections stay in this browser tab for up to 24 hours.'}</p>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div><button className="primary-button" type="submit" disabled={busy || !restored || !validDraft || (!preview && authLoading) || (signedIn && (profileLoading || !profile || countryMismatch))}>
      {busy ? 'Submitting…' : signedIn ? 'Submit request' : 'Sign in to save this request'}
    </button></div>
  </form>;
}
