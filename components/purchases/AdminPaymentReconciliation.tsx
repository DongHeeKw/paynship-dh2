'use client';
import { useState, type FormEvent } from 'react';
import { requestJson } from './api';
export default function AdminPaymentReconciliation({ id, version, onUpdated }: { id: string; version: number; onUpdated: () => void }) {
  const [draftId, setDraftId] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await requestJson(`/api/admin/purchases/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'reconcile_payment', version, draftId }) }); onUpdated(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not reconcile payment.'); } finally { setBusy(false); } }
  return <section className="detail-section"><h2 className="section-heading">Reconcile payment creation</h2><p className="muted mb-6">If payment creation timed out, locate the existing draft in Shopify. The server verifies its request reference and amounts before linking it. Paid status still requires a verified payment event.</p><form className="form-stack" onSubmit={submit}><label className="field">Existing Shopify draft ID<input required maxLength={120} pattern="gid://shopify/DraftOrder/[0-9]+" placeholder="gid://shopify/DraftOrder/123456" value={draftId} onChange={event => setDraftId(event.target.value)} /></label>{error && <p className="error-message" role="alert">{error}</p>}<div><button className="secondary-button" disabled={busy}>{busy ? 'Verifying…' : 'Verify & link draft'}</button></div></form></section>;
}
