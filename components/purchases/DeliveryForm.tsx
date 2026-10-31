'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { deliveryProfileSchema, type DeliveryProfile } from '@/lib/purchases/schemas';
import { deliveryProfileInput, type StoredDeliveryProfile } from '@/lib/customs/delivery';
import type { CustomsVerificationSnapshot } from '@/lib/customs/types';
import { usePurchaseClient } from './PurchaseClient';
import { changeDeliveryCountry, EMPTY_DELIVERY_PROFILE } from './delivery-form-data';
import DeliveryAddressFields from './DeliveryAddressFields';
import RecipientCustomsFields from './RecipientCustomsFields';
import CustomsVerificationNotice from './CustomsVerificationNotice';

export default function DeliveryForm() {
  const { request: requestJson, navigate } = usePurchaseClient();
  const params = useSearchParams();
  const [profile, setProfile] = useState<DeliveryProfile>(EMPTY_DELIVERY_PROFILE);
  const [snapshot, setSnapshot] = useState<CustomsVerificationSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void requestJson<{ profile: StoredDeliveryProfile | null }>('/api/delivery-profile', { signal: controller.signal })
      .then(({ profile: stored }) => {
        if (stored) { setProfile(deliveryProfileInput(stored)); setSnapshot(stored.customsVerification); }
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestJson]);

  function update(key: keyof DeliveryProfile, value: string) {
    if (busy) return;
    setProfile(previous => {
      if (key === 'country') return changeDeliveryCountry(previous, value as DeliveryProfile['country']);
      if (key === 'customsIdType') return {
        ...previous, customsIdType: value as DeliveryProfile['customsIdType'], customsId: '',
        customsAuthorization: value === 'NONE' ? 'DEFERRED' : 'NONE',
      };
      return { ...previous, [key]: value };
    });
    setSnapshot(null);
    setSaved(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = deliveryProfileSchema.safeParse(profile);
    if (!parsed.success) { setError(`${parsed.error.issues[0].path.join('.')}: ${parsed.error.issues[0].message}`); return; }
    setBusy(true); setError('');
    try {
      const result = await requestJson<{ profile: StoredDeliveryProfile }>('/api/delivery-profile', {
        method: 'PUT', body: JSON.stringify(parsed.data),
      });
      setProfile(deliveryProfileInput(result.profile));
      setSnapshot(result.profile.customsVerification);
      setSaved(true);
      if (params.get('next') === '/purchase') navigate('/purchase');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save delivery details.');
    } finally { setBusy(false); }
  }

  async function remove() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await requestJson('/api/delivery-profile', { method: 'DELETE' });
      setProfile(EMPTY_DELIVERY_PROFILE); setSnapshot(null); setSaved(false); setDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete delivery details.');
    } finally { setBusy(false); }
  }

  if (loading) return <p className="muted" role="status">Loading delivery details...</p>;
  return <form className="form-stack" onSubmit={submit}>
    <fieldset className="form-stack" disabled={busy}>
    <DeliveryAddressFields profile={profile} onChange={update} />
    <RecipientCustomsFields profile={profile} onChange={update} />
    </fieldset>
    <CustomsVerificationNotice snapshot={snapshot} />
    {error && <p className="error-message" role="alert">{error}</p>}
    {saved && <p role="status" className="notice">Delivery details saved.</p>}
    <div className="action-row">
      <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save details'}</button>
      <button className="text-button" type="button" disabled={busy} onClick={() => setDeleteConfirm(true)}>Delete saved details</button>
    </div>
    {deleteConfirm && <div className="notice">
      <p>Delete the delivery details saved to your account? Existing request records will remain.</p>
      <div className="action-row">
        <button type="button" className="secondary-button" disabled={busy} onClick={() => void remove()}>Confirm deletion</button>
        <button type="button" className="text-button" onClick={() => setDeleteConfirm(false)}>Keep details</button>
      </div>
    </div>}
  </form>;
}
