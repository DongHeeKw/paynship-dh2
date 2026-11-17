import type { SampleRequest } from '@/features/workspace/core/types';
import { dollars, shortReference, workspaceDate, COUNTRY_LABELS } from './format';
import { ProductArtwork, WorkspaceIcon } from './WorkspaceArt';

const estimateRows = [
  ['productCents', 'Product estimate'], ['domesticShippingCents', 'Shipping within Korea'],
  ['serviceFeeCents', 'Purchase service'], ['internationalShippingCents', 'International shipping'],
  ['insuranceCents', 'Parcel insurance'],
] as const;

export function SampleStatus({ request }: { request: Pick<SampleRequest, 'status' | 'statusLabel' | 'paymentReceived'> }) {
  const tone = request.status === 'DELIVERED' ? 'complete' : request.paymentReceived || ['SHIPPED', 'AT_WAREHOUSE'].includes(request.status) ? 'progress' : request.status === 'CANCELLED' ? 'muted' : 'waiting';
  return <span className={`dw-status dw-status-${tone}`}><span aria-hidden="true" />Sample · {request.statusLabel.replace(/^SAMPLE\s+/i, '')}</span>;
}

export default function OrderDetail({ request, balanceCents, busy, onPay, onTopUp, onCancel, onDelivery }: {
  request: SampleRequest; balanceCents: number; busy: boolean;
  onPay: () => void; onTopUp: () => void; onCancel: () => void; onDelivery: () => void;
}) {
  const quote = request.quote;
  const canPay = !request.paymentReceived && ['QUOTED', 'PAYMENT_PENDING'].includes(request.status) && Boolean(quote);
  const insufficient = Boolean(quote && balanceCents < quote.subtotalCents);
  return <article className="dw-card dw-order-detail" aria-label="Selected order details">
    <div className="dw-card-heading"><div><p className="dw-eyebrow">YOUR ORDER</p><h2>{shortReference(request.id)}</h2></div><SampleStatus request={request} /></div>
    <div className="dw-detail-product"><ProductArtwork name={request.productName} /><div><span className="dw-retailer"><span aria-hidden="true">N</span> Naver · Sample item</span><h3>{request.productName}</h3><p>{request.quantity} item{request.quantity === 1 ? '' : 's'}{request.options ? ` · ${request.options}` : ''}</p><a className="dw-text-link" href={request.sourceUrl} target="_blank" rel="noopener noreferrer">View source listing <span aria-hidden="true">↗</span></a></div></div>
    <div className="dw-order-meta"><span>Destination<strong>{COUNTRY_LABELS[request.destination] ?? request.destination}</strong></span><span>Requested<strong>{workspaceDate(request.createdAt)}</strong></span><span>Product evidence<strong>Unverified sample</strong></span></div>
    <section className="dw-estimate" aria-labelledby="dw-estimate-heading"><div className="dw-section-heading"><h3 id="dw-estimate-heading">A little cost clarity.</h3><span className="dw-small-badge">Sample estimate</span></div>
      {quote ? <><dl className="dw-cost-list">{estimateRows.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{dollars(quote[key])}</dd></div>)}<div><dt>Import duty</dt><dd className="dw-pending">Pending review</dd></div><div><dt>Import tax</dt><dd className="dw-pending">Pending review</dd></div><div className="dw-cost-total"><dt>Sample subtotal <small>Excludes unknown duty & tax</small></dt><dd>{dollars(quote.subtotalCents)}<small>USD</small></dd></div></dl><p className="dw-fine-print">Scenario only: ₩{quote.exchangeRateKrwPerUsd.toLocaleString('en-US')} = $1. Product prices and shipping charges are fictional estimates. Customs classification and tax amounts are unverified.</p></>
        : <p className="dw-muted">This sample request is waiting for an estimate. Choose another prepared order to explore the payment flow.</p>}
    </section>
    {request.paymentReceived ? <div className="dw-payment-receipt"><span className="dw-success-mark"><WorkspaceIcon name="check" size={18} /></span><div><strong>Paid with sample credit</strong><span>{quote ? dollars(quote.subtotalCents) : 'Sample amount'} · Fictional transaction</span></div><button type="button" className="dw-icon-button" onClick={onDelivery} aria-label="View sample delivery"><WorkspaceIcon name="arrow" /></button></div>
      : canPay ? <div className="dw-payment-action"><p><WorkspaceIcon name="wallet" size={17} />Available sample credit <strong>{dollars(balanceCents)}</strong></p>{insufficient ? <><button className="dw-button dw-button-primary" type="button" disabled={busy} onClick={onTopUp}>Add $100 sample credit <WorkspaceIcon name="plus" size={18} /></button><span className="dw-fine-print">Add sample funds to continue this payment.</span></> : <button className="dw-button dw-button-primary" type="button" disabled={busy} onClick={onPay}>{busy ? 'Saving…' : `Pay ${dollars(quote!.subtotalCents)} with sample credit`}<WorkspaceIcon name="arrow" size={18} /></button>}<span className="dw-fine-print">Simulates a wallet payment in the local sample database.</span></div>
        : null}
    {!request.paymentReceived && ['REVIEW_REQUIRED', 'QUOTED'].includes(request.status) && <button className="dw-text-link dw-cancel-link" type="button" disabled={busy} onClick={onCancel}>Cancel sample request</button>}
  </article>;
}
