import { STATUS_LABELS, type PurchaseStatus } from '@/lib/purchases/status';
import { formatDate } from './labels';
import type { PurchaseEvent } from './types';
export default function StatusTimeline({ events, carrier, trackingNumber }: { events: PurchaseEvent[]; carrier: string | null; trackingNumber: string | null }) {
  return <section className="detail-section"><h2 className="section-heading">Delivery & updates</h2>{trackingNumber ? <dl className="detail-grid mb-8"><dt>Carrier</dt><dd>{carrier || 'Not yet assigned'}</dd><dt>Tracking number</dt><dd>{trackingNumber}</dd></dl> : <p className="muted mb-8">Carrier and tracking details appear when your shipment is dispatched.</p>}<ol className="timeline">{events.map((event, index) => <li key={`${event.createdAt}-${index}`}><strong className="text-sm">{STATUS_LABELS[event.status as PurchaseStatus] || event.status}</strong><p>{event.message}</p><time dateTime={event.createdAt}>{formatDate(event.createdAt)} · {event.source === 'carrier' ? 'Carrier update' : 'Request update'}</time></li>)}</ol>{events.length === 0 && <p className="muted">No updates yet.</p>}</section>;
}
