'use client';
import { useState, type FormEvent } from 'react';
import { requestJson } from './api';
import type { SupportTicket } from './types';
export default function AdminSupportReply({ ticket, onUpdated }: { ticket: SupportTicket; onUpdated: () => void }) {
  const [reply, setReply] = useState(ticket.reply || ''); const [status, setStatus] = useState(ticket.status); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await requestJson(`/api/admin/support/${ticket.id}`, { method: 'PATCH', body: JSON.stringify({ version: ticket.version, reply, status }) }); onUpdated(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not send reply. Refresh to check for another reply.'); } finally { setBusy(false); } }
  return <form className="form-stack mt-6" onSubmit={submit}><label className="field">Reply<textarea required minLength={5} maxLength={2000} value={reply} onChange={event => setReply(event.target.value)} /></label><label className="field">Resolution<select value={status} onChange={event => setStatus(event.target.value)}><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option></select></label>{error && <p className="error-message" role="alert">{error}</p>}<div><button className="secondary-button" disabled={busy}>{busy ? 'Sending…' : 'Save reply'}</button></div></form>;
}
