'use client';
import { useState, type FormEvent } from 'react';
import { usePurchaseClient } from './PurchaseClient';
export default function SupportForm({ id, onSent }: { id: string; onSent: () => void }) {
  const { request: requestJson } = usePurchaseClient();
  const [subject, setSubject] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await requestJson(`/api/purchases/${id}/support`, { method: 'POST', body: JSON.stringify({ subject, message }) }); setSubject(''); setMessage(''); onSent(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not send your message.'); } finally { setBusy(false); }
  }
  return <form className="form-stack mt-6" onSubmit={submit}><label className="field">Subject<input required minLength={3} maxLength={120} value={subject} onChange={event => setSubject(event.target.value)} /></label><label className="field">Message<textarea required minLength={10} maxLength={2000} placeholder="Tell us what you need help with. Do not include card details or passwords." value={message} onChange={event => setMessage(event.target.value)} /></label>{error && <p className="error-message" role="alert">{error}</p>}<div><button className="secondary-button" disabled={busy}>{busy ? 'Sending…' : 'Send message'}</button></div></form>;
}
