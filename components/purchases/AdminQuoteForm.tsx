'use client';

import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import type { PurchaseReview } from '@/lib/purchases/review-schema';
import type { RecipientEvidence } from '@/lib/customs/recipient-evidence';
import { requestJson } from './api';
import { parseQuoteForm } from './quote-form-data';
import ReviewProductFields from './ReviewProductFields';
import ReviewCostFields from './ReviewCostFields';
import ReviewCustomsFields from './ReviewCustomsFields';
import ReviewImportCharges from './ReviewImportCharges';
import RecipientEvidenceFields from './RecipientEvidenceFields';

interface Props {
  id: string;
  version: number;
  country: string;
  review: (PurchaseReview & { recipientEvidence?: RecipientEvidence }) | null;
  revalidate?: boolean;
  onUpdated: () => void;
}

export default function AdminQuoteForm({ id, version, country, review, revalidate = false, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    try {
      const parsed = parseQuoteForm(new FormData(event.currentTarget));
      setBusy(true);
      await requestJson(`/api/admin/purchases/${id}`, {
        method: 'PATCH', body: JSON.stringify({ action: revalidate ? 'revalidate' : 'quote', version, review: parsed }),
      });
      onUpdated();
    } catch (err) {
      setError(err instanceof z.ZodError ? `${err.issues[0].path.join('.')}: ${err.issues[0].message}`
        : err instanceof Error ? err.message : 'Could not approve quote.');
    } finally { setBusy(false); }
  }

  return <form className="form-stack" onSubmit={submit}>
    {revalidate && <p className="notice">Refresh product and customs evidence for this held request. Previously confirmed financial amounts must stay unchanged.</p>}
    <ReviewProductFields review={review} />
    <ReviewCostFields review={review} />
    <ReviewImportCharges review={review} country={country} revalidate={revalidate} />
    <ReviewCustomsFields review={review} />
    <RecipientEvidenceFields country={country} evidence={review?.recipientEvidence} />
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" required className="mt-1" />I verified the product evidence, recipient requirements, destination eligibility, and applicable import rules.
    </label>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div><button className="primary-button" disabled={busy}>{busy ? 'Saving...' : revalidate ? 'Save revalidated evidence' : 'Approve calculated quote'}</button></div>
  </form>;
}
