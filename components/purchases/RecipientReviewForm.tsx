'use client';

import { useState, type FormEvent } from 'react';
import type { RecipientEvidence } from '@/lib/customs/recipient-evidence';
import RecipientEvidenceFields from './RecipientEvidenceFields';
import { parseRecipientEvidenceForm } from './recipient-form-data';
import { requestJson } from './api';

interface Props { id: string; version: number; country: string; evidence?: RecipientEvidence | null; onUpdated: () => void; }

export default function RecipientReviewForm({ id, version, country, evidence, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const updated = parseRecipientEvidenceForm(new FormData(event.currentTarget));
      await requestJson(`/api/admin/purchases/${id}`, {
        method: 'PATCH', body: JSON.stringify({ action: 'recipient_review', version, evidence: updated }),
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save recipient review.');
    } finally { setBusy(false); }
  }
  return <section className="detail-section">
    <h2 className="section-heading">Update recipient documents or shipment authorization</h2>
    <p className="muted mb-6">Record new recipient evidence for this request. This preserves the approved price and current fulfilment stage.</p>
    <form className="form-stack" onSubmit={submit}>
      <RecipientEvidenceFields country={country} evidence={evidence} />
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1" />I checked the recipient requirements and external authorization through the stated process.</label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div><button className="secondary-button" disabled={busy}>{busy ? 'Saving...' : 'Save recipient review'}</button></div>
    </form>
  </section>;
}
