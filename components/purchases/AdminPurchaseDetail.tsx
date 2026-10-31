'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { requestJson } from './api';
import type { PurchaseDetail } from './types';
import type { DeliveryProfile } from '@/lib/purchases/schemas';
import type { PurchaseReview } from '@/lib/purchases/review-schema';
import PurchaseFacts from './PurchaseFacts';
import QuoteSummary from './QuoteSummary';
import StatusTimeline from './StatusTimeline';
import SupportThread from './SupportThread';
import AdminQuoteForm from './AdminQuoteForm';
import AdminStatusForm from './AdminStatusForm';
import AdminRejectForm from './AdminRejectForm';
import AdminDeliveryDetails from './AdminDeliveryDetails';
import AdminPaymentReconciliation from './AdminPaymentReconciliation';
import RecipientReviewForm from './RecipientReviewForm';
import type { RecipientEvidence } from '@/lib/customs/recipient-evidence';
interface OperatorDetail { request: PurchaseDetail; delivery: DeliveryProfile; review: (PurchaseReview & { recipientEvidence?: RecipientEvidence }) | null; }
export default function AdminPurchaseDetail({ id }: { id: string }) {
  const [data, setData] = useState<OperatorDetail | null>(null); const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => { setBusy(true); setError(''); try { setData(await requestJson<OperatorDetail>(`/api/admin/purchases/${id}`, { signal })); } catch (err) { if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load request.'); } finally { if (!signal?.aborted) setBusy(false); } }, [id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  return <>
    <Link href="/admin/purchases" className="muted">← Purchase requests</Link>
    {error && <p role="alert" className="error-message">{error}</p>}
    {busy && !data && <p role="status" className="muted mt-6">Loading request…</p>}
    {data && <>
      <div className="page-heading mt-6">
        <h1>Review & fulfilment</h1>
        <p className="font-mono text-xs">{data.request.id}</p>
        <span className="status-label">{data.request.statusLabel}</span>
      </div>
      <button className="text-button mb-6" disabled={busy} onClick={() => void load()}>Refresh request</button>
      <PurchaseFacts request={data.request} />
      <AdminDeliveryDetails delivery={data.delivery} />
      <QuoteSummary quote={data.request.quote} expires={data.request.quoteExpiresAt} />
      {['REVIEW_REQUIRED', 'QUOTED'].includes(data.request.status) && <>
        <section className="detail-section">
          <h2 className="section-heading">Evidence & quote approval</h2>
          <p className="notice mb-6">Verify the destination&apos;s rules and product evidence before approving. Prices, duty, and tax are calculated from the confirmed values below.</p>
          <AdminQuoteForm key={`${id}-${data.request.version}`} id={id} version={data.request.version} country={data.request.destination} review={data.review} onUpdated={() => void load()} />
        </section>
        <AdminRejectForm id={id} version={data.request.version} onUpdated={() => void load()} />
      </>}
      {data.request.status === 'ON_HOLD' && (data.request.paymentReceived && !data.request.fulfilmentStarted ?
        <section className="detail-section">
          <h2 className="section-heading">Revalidate product & customs evidence</h2>
          <AdminQuoteForm key={`revalidate-${data.request.version}`} id={id} version={data.request.version} country={data.request.destination} review={data.review} revalidate onUpdated={() => void load()} />
        </section> : !data.request.paymentReceived && !data.request.fulfilmentStarted ?
        <AdminPaymentReconciliation key={`payment-${data.request.version}`} id={id} version={data.request.version} onUpdated={() => void load()} /> : null)}
      {data.review && ['PAID', 'PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'ON_HOLD'].includes(data.request.status) &&
        <RecipientReviewForm key={`recipient-${data.request.version}`} id={id} version={data.request.version} country={data.request.destination} evidence={data.review.recipientEvidence} onUpdated={() => void load()} />}
      <AdminStatusForm key={`status-${data.request.version}`} request={data.request} onUpdated={() => void load()} />
      <StatusTimeline events={data.request.events} carrier={data.request.carrier} trackingNumber={data.request.trackingNumber} />
      <section className="detail-section">
        <h2 className="section-heading">Customer support</h2>
        <SupportThread tickets={data.request.tickets} />
        <Link href="/admin/support" className="muted">Open support queue</Link>
      </section>
    </>}
    {!busy && !data && <button className="secondary-button mt-5" onClick={() => void load()}>Try again</button>}
  </>;
}
