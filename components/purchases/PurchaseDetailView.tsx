'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePurchaseClient } from './PurchaseClient';
import type { PurchaseDetail } from './types';
import PurchaseFacts from './PurchaseFacts';
import QuoteSummary from './QuoteSummary';
import StatusTimeline from './StatusTimeline';
import SupportThread from './SupportThread';
import SupportForm from './SupportForm';
import { previewSampleLabel } from '@/lib/dev-preview/sample-requests';
export default function PurchaseDetailView({ id }: { id: string }) {
  const { request: requestJson, href, preview } = usePurchaseClient();
  const [request, setRequest] = useState<PurchaseDetail | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState(''); const [actionBusy, setActionBusy] = useState(false); const [confirmCancel, setConfirmCancel] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true); setError('');
    try { const data = await requestJson<{ request: PurchaseDetail }>(`/api/purchases/${id}`, { signal }); setRequest(data.request); } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load request.'); } finally { if (!signal?.aborted) setBusy(false); }
  }, [id, requestJson]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  async function cancel() {
    if (!request || actionBusy) return; setActionBusy(true); setError('');
    try { await requestJson(`/api/purchases/${id}/cancel`, { method: 'POST', body: JSON.stringify({ version: request.version }) }); setConfirmCancel(false); await load(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not cancel request.'); } finally { setActionBusy(false); }
  }
  async function checkout() {
    if (!request || actionBusy) return; setActionBusy(true); setError('');
    try {
      const result = await requestJson<{ checkoutUrl: string }>(`/api/purchases/${id}/checkout`, { method: 'POST', body: JSON.stringify({ version: request.version }) });
      const checkoutUrl = new URL(result.checkoutUrl); if (checkoutUrl.protocol !== 'https:') throw new Error('Payment link is unavailable.'); window.location.assign(checkoutUrl.toString());
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open payment.'); setActionBusy(false); }
  }
  const quoteCurrent = request?.quoteExpiresAt && Date.parse(request.quoteExpiresAt) > Date.now();
  const canCheckout = !preview && quoteCurrent && (request?.status === 'QUOTED' || (request?.status === 'PAYMENT_PENDING' && request.checkoutAvailable));
  return <>
    <Link href={href('/orders')} className="muted">← Your requests</Link>
    {error && <p className="error-message" role="alert">{error}</p>}
    {busy && !request && <p role="status" className="muted mt-6">Loading request…</p>}
    {request && <>
      <div className="page-heading mt-6">
        <h1>{typeof request.quote?.productName === 'string' ? request.quote.productName : 'Purchase request'}</h1>
        {preview && <p className="muted">{previewSampleLabel(request.id) ?? 'Your local preview request'}</p>}
        <p className="font-mono text-xs">{request.id}</p>
        <span className="status-label">{request.statusLabel}</span>
      </div>
      <div className="action-row mb-8">
        <button className="text-button" disabled={busy || actionBusy} onClick={() => void load()}>Refresh status</button>
        {canCheckout && <button className="primary-button" disabled={busy || actionBusy} onClick={() => void checkout()}>
          {actionBusy ? 'Opening payment…' : request.status === 'PAYMENT_PENDING' ? 'Continue payment' : 'Review & pay'}
        </button>}
        {['REVIEW_REQUIRED', 'QUOTED'].includes(request.status) && <button className="text-button" disabled={actionBusy} onClick={() => setConfirmCancel(true)}>Cancel request</button>}
      </div>
      {confirmCancel && <div className="notice mb-8">
        <p>Cancel this purchase request?</p>
        <div className="action-row">
          <button className="secondary-button" disabled={actionBusy} onClick={() => void cancel()}>Confirm cancellation</button>
          <button className="text-button" onClick={() => setConfirmCancel(false)}>Keep request</button>
        </div>
      </div>}
      <PurchaseFacts request={request} />
      <QuoteSummary quote={request.quote} expires={request.quoteExpiresAt} />
      <StatusTimeline events={request.events} carrier={request.carrier} trackingNumber={request.trackingNumber} />
      <section className="detail-section">
        <h2 className="section-heading">Support</h2>
        <SupportThread tickets={request.tickets} />
        <SupportForm id={id} onSent={() => void load()} />
      </section>
    </>}
    {!busy && !request && <button className="secondary-button mt-5" onClick={() => void load()}>Try again</button>}
  </>;
}
