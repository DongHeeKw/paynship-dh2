'use client';
import { useState, type FormEvent } from 'react';
import { requestJson } from './api';
export default function AdminRejectForm({ id, version, onUpdated }: { id: string; version: number; onUpdated: () => void }) {
  const [open, setOpen] = useState(false); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await requestJson(`/api/admin/purchases/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'reject', version, reason }) }); onUpdated(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not reject request.'); } finally { setBusy(false); } }
  return <section className="detail-section">{open ? <form className="form-stack" onSubmit={submit}><label className="field">Reason for rejection<textarea required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /><small>This reason is visible to the customer.</small></label>{error && <p role="alert" className="error-message">{error}</p>}<div className="action-row"><button className="secondary-button" disabled={busy}>Reject request</button><button type="button" className="text-button" onClick={() => setOpen(false)}>Keep reviewing</button></div></form> : <button className="text-button" onClick={() => setOpen(true)}>Cannot fulfil this request</button>}</section>;
}
