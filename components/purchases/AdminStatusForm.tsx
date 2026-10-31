'use client';
import { useState, type FormEvent } from 'react';
import { TRANSITIONS, STATUS_LABELS, type PurchaseStatus } from '@/lib/purchases/status';
import { requestJson } from './api';
import type { PurchaseDetail } from './types';
const OPERATOR_STATUSES = ['PURCHASING', 'AT_WAREHOUSE', 'READY_TO_SHIP', 'SHIPPED', 'ON_HOLD'];
export default function AdminStatusForm({ request, onUpdated }: { request: PurchaseDetail; onUpdated: () => void }) {
  const allowed = (TRANSITIONS[request.status as PurchaseStatus] || []).filter(status => OPERATOR_STATUSES.includes(status));
  const [status, setStatus] = useState(allowed[0] || 'ON_HOLD'); const [message, setMessage] = useState(''); const [carrier, setCarrier] = useState(request.carrier || ''); const [trackingNumber, setTrackingNumber] = useState(request.trackingNumber || ''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    const action = request.status === 'ON_HOLD' ? { action: 'resume', version: request.version, reason: message } : { action: 'status', version: request.version, status, message, ...(status === 'SHIPPED' ? { carrier, trackingNumber } : {}) };
    try { await requestJson(`/api/admin/purchases/${request.id}`, { method: 'PATCH', body: JSON.stringify(action) }); onUpdated(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not update status.'); } finally { setBusy(false); }
  }
  if (!allowed.length && request.status !== 'ON_HOLD') return null;
  return <section className="detail-section"><h2 className="section-heading">{request.status === 'ON_HOLD' ? 'Resolve hold' : 'Update fulfilment'}</h2><form className="form-stack" onSubmit={submit}>{request.status !== 'ON_HOLD' && <label className="field">Next status<select value={status} onChange={event => setStatus(event.target.value as PurchaseStatus)}>{allowed.map(item => <option value={item} key={item}>{STATUS_LABELS[item]}</option>)}</select></label>}{status === 'SHIPPED' && request.status !== 'ON_HOLD' && <div className="field-grid"><label className="field">Carrier<input required minLength={2} maxLength={60} value={carrier} onChange={event => setCarrier(event.target.value)} /></label><label className="field">Tracking number<input required minLength={3} maxLength={100} value={trackingNumber} onChange={event => setTrackingNumber(event.target.value)} /></label></div>}<label className="field">{request.status === 'ON_HOLD' ? 'How the issue was resolved' : 'Customer update'}<textarea required minLength={request.status === 'ON_HOLD' ? 10 : 5} maxLength={500} value={message} onChange={event => setMessage(event.target.value)} /><small>This update is visible to the customer.</small></label>{request.status === 'ON_HOLD' && <p className="muted">Resuming returns to the previous confirmed fulfilment step. Unresolved payments must be reconciled first.</p>}{error && <p className="error-message" role="alert">{error}</p>}<div><button className="primary-button" disabled={busy}>{busy ? 'Updating…' : request.status === 'ON_HOLD' ? 'Resolve & resume' : 'Update status'}</button></div></form></section>;
}
