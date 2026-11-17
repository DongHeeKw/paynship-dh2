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
import DeliveryAddressPreview from './DeliveryAddressPreview';
import './delivery-details.css';

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
  const [hasStoredProfile, setHasStoredProfile] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadFailed(false); setError('');
    void requestJson<{ profile: StoredDeliveryProfile | null }>('/api/delivery-profile', { signal: controller.signal })
      .then(({ profile: stored }) => {
        if (controller.signal.aborted) return;
        setHasStoredProfile(!!stored);
        if (stored) { setProfile(deliveryProfileInput(stored)); setSnapshot(stored.customsVerification); }
      })
      .catch(() => { if (!controller.signal.aborted) setLoadFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestJson, loadAttempt]);

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
    setError('');
    setDeleteConfirm(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = deliveryProfileSchema.safeParse(profile);
    if (!parsed.success) {
      const labels: Record<string, string> = { fullName: 'Recipient name', phone: 'Phone number', country: 'Destination country', address1: 'Street address', address2: 'Apartment or building', city: 'City', region: 'State or region', postalCode: 'Postal code', customsId: 'Customs identifier', customsIdType: 'Identifier type', customsAuthorization: 'Authorization route' };
      const issue = parsed.error.issues[0];
      setError(`${labels[String(issue.path[0])] || 'Delivery details'}: ${issue.message}`);
      return;
    }
    setBusy(true); setError('');
    try {
      const result = await requestJson<{ profile: StoredDeliveryProfile }>('/api/delivery-profile', {
        method: 'PUT', body: JSON.stringify(parsed.data),
      });
      setProfile(deliveryProfileInput(result.profile));
      setSnapshot(result.profile.customsVerification);
      setHasStoredProfile(true);
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
      setProfile(EMPTY_DELIVERY_PROFILE); setSnapshot(null); setSaved(false); setDeleteConfirm(false); setHasStoredProfile(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete delivery details.');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="delivery-loading" role="status"><span aria-hidden="true" />Getting your delivery details ready…</div>;
  if (loadFailed) return <div className="delivery-load-error"><h2>We couldn’t open your address book.</h2><p role="alert">Your saved details could not be loaded. Please try again before making changes.</p><button type="button" className="secondary-button" onClick={() => setLoadAttempt(value => value + 1)}>Try again</button></div>;
  return <div className="delivery-form-layout"><form className="delivery-form form-stack" aria-label="Delivery details" aria-busy={busy} onSubmit={submit}>
      <fieldset className="form-stack delivery-fields" disabled={busy}>
        <legend className="sr-only">Recipient, address, and customs details</legend>
        <section className="delivery-address-section" aria-labelledby="recipient-heading">
          <div className="delivery-section-heading"><span aria-hidden="true">01</span><div><h2 id="recipient-heading">Recipient & address</h2><p>Tell us where your next find should land.</p></div></div>
          <div className="form-stack"><DeliveryAddressFields profile={profile} onChange={update} /></div>
        </section>
        <RecipientCustomsFields profile={profile} onChange={update} />
      </fieldset>
      <CustomsVerificationNotice snapshot={snapshot} />
      {error && <p className="error-message" role="alert">{error}</p>}
      {saved && <p role="status" className="delivery-saved"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="m7 12 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Delivery details saved. Ready for your next request.</p>}
      <div className="delivery-form-actions"><div className="action-row">
        <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : params.get('next') === '/purchase' ? 'Save & continue' : 'Save delivery details'}<span aria-hidden="true">↗</span></button>
        {hasStoredProfile && <button className="text-button delivery-delete" type="button" disabled={busy} onClick={() => setDeleteConfirm(true)}>Delete saved details</button>}
      </div><small>Saved details are used for new requests. Shipping availability is reviewed separately.</small></div>
      {deleteConfirm && <div className="delivery-delete-confirm" role="group" aria-label="Confirm address deletion">
        <strong>Remove this saved address?</strong><p>Existing request records will remain.</p><div className="action-row">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => void remove()}>Confirm deletion</button>
          <button type="button" className="text-button" disabled={busy} onClick={() => setDeleteConfirm(false)}>Keep details</button>
        </div>
      </div>}
    </form><DeliveryAddressPreview profile={profile} />
  </div>;
}
