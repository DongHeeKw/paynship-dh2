'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { requestJson } from './api';
import AdminSupportReply from './AdminSupportReply';
import type { SupportTicket } from './types';
interface QueueTicket extends SupportTicket { requestId: string; updatedAt: string; }
export default function AdminSupportQueue() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async (next?: string, signal?: AbortSignal) => { setBusy(true); setError(''); try { const data = await requestJson<{ tickets: QueueTicket[]; nextCursor: string | null }>(`/api/admin/support${next ? `?cursor=${encodeURIComponent(next)}` : ''}`, { signal }); setTickets(previous => next ? [...previous, ...data.tickets] : data.tickets); setCursor(data.nextCursor); } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load support.'); } finally { if (!signal?.aborted) setBusy(false); } }, []);
  useEffect(() => { const controller = new AbortController(); void load(undefined, controller.signal); return () => controller.abort(); }, [load]);
  return <><button className="text-button mb-6" disabled={busy} onClick={() => void load()}>Refresh</button>{error && <p role="alert" className="error-message">{error}</p>}{busy && tickets.length === 0 && <p role="status" className="muted">Loading enquiries…</p>}{!busy && !error && tickets.length === 0 && <p className="notice">No support enquiries yet.</p>}{tickets.map(ticket => <article className="ticket" key={ticket.id}><div className="action-row"><h2 className="section-heading mb-0">{ticket.subject}</h2><span className="status-label">{ticket.status === 'RESOLVED' ? 'Resolved' : 'Open'}</span></div><p>{ticket.message}</p><Link className="muted" href={`/admin/purchases/${ticket.requestId}`}>Open purchase request</Link><AdminSupportReply key={`${ticket.id}-${ticket.version}`} ticket={ticket} onUpdated={() => void load()} /></article>)}{cursor && <button className="secondary-button" disabled={busy} onClick={() => void load(cursor)}>Load more</button>}</>;
}
