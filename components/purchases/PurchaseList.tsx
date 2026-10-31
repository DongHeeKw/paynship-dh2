'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePurchaseClient } from './PurchaseClient';
import { CATEGORY_LABELS, countryName, formatDate } from './labels';
import type { ProductCategory } from '@/lib/purchases/categories';
import type { PurchaseSummary } from './types';
import { previewSampleLabel } from '@/lib/dev-preview/sample-requests';
export default function PurchaseList({ admin = false }: { admin?: boolean }) {
  const { request: requestJson, href, preview } = usePurchaseClient();
  const [requests, setRequests] = useState<PurchaseSummary[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async (next?: string, signal?: AbortSignal) => {
    setBusy(true); setError('');
    try {
      const data = await requestJson<{ requests: PurchaseSummary[]; nextCursor: string | null }>(`${admin ? '/api/admin/purchases' : '/api/purchases'}${next ? `?cursor=${encodeURIComponent(next)}` : ''}`, { signal });
      setRequests(previous => next ? [...previous, ...data.requests] : data.requests); setCursor(data.nextCursor);
    } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load requests.'); } finally { if (!signal?.aborted) setBusy(false); }
  }, [admin, requestJson]);
  useEffect(() => { const controller = new AbortController(); void load(undefined, controller.signal); return () => controller.abort(); }, [load]);
  return <>
    <div className="action-row mb-6"><button className="text-button" onClick={() => void load()} disabled={busy}>Refresh</button>{!admin && <Link href={href('/purchase')} className="text-button">New request</Link>}</div>
    {error && <p className="error-message" role="alert">{error}</p>}
    {busy && requests.length === 0 && <p className="muted" role="status">Loading requests…</p>}
    {!busy && !error && requests.length === 0 && <div className="notice">No requests yet. {admin ? 'New customer requests will appear here.' : <Link href={href('/')} >Start with a product link</Link>}</div>}
    <ul className="request-list">{requests.map(request => <li key={request.id}><Link className="request-link" href={href(`${admin ? '/admin/purchases' : '/orders'}/${request.id}`)}><div>
      <strong>{typeof request.quote?.productName === 'string' ? request.quote.productName : CATEGORY_LABELS[request.category as ProductCategory] || 'Purchase request'}</strong>
      {preview && <p className="muted">{previewSampleLabel(request.id) ?? 'Your local preview request'}</p>}
      <p>{countryName(request.destination)} · {request.quantity} item{request.quantity === 1 ? '' : 's'} · {formatDate(request.createdAt)}</p><p className="font-mono text-xs">{request.id}</p>
    </div><span className="status-label">{request.statusLabel}</span></Link></li>)}</ul>
    {cursor && <button className="secondary-button" disabled={busy} onClick={() => void load(cursor)}>{busy ? 'Loading…' : 'Load more'}</button>}
  </>;
}
