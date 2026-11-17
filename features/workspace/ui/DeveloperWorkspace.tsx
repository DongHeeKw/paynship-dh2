'use client';

import { useEffect, useRef, useState } from 'react';
import type { WorkspaceAction, WorkspaceData, SampleRequest } from '@/features/workspace/core/types';
import { AccountPanel, SupportPanel } from './WorkspaceAccount';
import PaymentsPanel from './WorkspacePayments';
import DeliveryPanel from './WorkspaceDelivery';
import WorkspaceCustoms from './WorkspaceCustoms';
import OrderDetail, { SampleStatus } from './OrderDetail';
import { COUNTRY_LABELS, dollars, initials, shortReference, workspaceDate } from './format';
import { JourneyArtwork, ParcelMark, ProductArtwork, WorkspaceIcon, type WorkspaceIconName } from './WorkspaceArt';
import './workspace.css';

type View = 'overview' | 'orders' | 'payments' | 'delivery' | 'customs' | 'account' | 'support';
type WithoutMetadata<T> = T extends unknown ? Omit<T, 'customerId' | 'idempotencyKey'> : never;
type ActionInput = WithoutMetadata<WorkspaceAction>;
const navigation: { id: View; label: string; icon: WorkspaceIconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'home' }, { id: 'orders', label: 'My orders', icon: 'orders' },
  { id: 'payments', label: 'Payments', icon: 'wallet' }, { id: 'delivery', label: 'Delivery', icon: 'delivery' },
  { id: 'customs', label: 'Customs review', icon: 'orders' },
  { id: 'account', label: 'My account', icon: 'account' },
];
const viewTitles: Record<View, string> = { overview: 'Your little corner of Korea.', orders: 'Good finds, on their way.', payments: 'Every little detail adds up.', delivery: 'Follow your parcel’s story.', customs: 'A clearer path through customs.', account: 'Make yourself at home.', support: 'A little help, whenever.' };
const CUSTOMER_STORAGE_KEY = 'paynship:workspace:ghost';
const CUSTOMER_IDS = ['sample-customer-cn', 'sample-customer-jp', 'sample-customer-us'];

async function readResponse(response: Response): Promise<WorkspaceData> {
  const payload = await response.json() as WorkspaceData & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? 'Your sample workspace could not be loaded. Please try again.');
  if (payload.sampleOnly !== true || !Array.isArray(payload.customers) || !Array.isArray(payload.requests)) throw new Error('The sample workspace returned an unexpected response.');
  return payload;
}

export default function DeveloperWorkspace() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [customerId, setCustomerId] = useState('sample-customer-jp');
  const [customerReady, setCustomerReady] = useState(false);
  const [view, setView] = useState<View>('overview');
  const [selectedId, setSelectedId] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reload, setReload] = useState(0);
  const activeCustomer = useRef(customerId);
  const mutationPending = useRef(false);
  activeCustomer.current = customerId;

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (saved && CUSTOMER_IDS.includes(saved)) setCustomerId(saved);
    } catch { /* The workspace also works when browser storage is unavailable. */ }
    setCustomerReady(true);
  }, []);

  useEffect(() => {
    if (!customerReady) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setFeedback('');
    void fetch(`/dev/workspace/data?customerId=${encodeURIComponent(customerId)}`, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' })
      .then(readResponse).then(workspace => {
        if (controller.signal.aborted) return;
        setData(workspace); setSelectedId(workspace.requests[0]?.id ?? '');
      }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Please try loading the sample workspace again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [customerId, customerReady, reload]);

  function switchCustomer(id: string) {
    if (!CUSTOMER_IDS.includes(id)) return;
    try { sessionStorage.setItem(CUSTOMER_STORAGE_KEY, id); } catch { /* Selection still works for this page. */ }
    setCustomerId(id); setData(null); setView('overview'); setShowCatalog(false);
  }

  async function mutate(action: ActionInput, success: string): Promise<WorkspaceData | null> {
    if (mutationPending.current || !data || loading) return null;
    mutationPending.current = true; setBusy(true); setError(''); setFeedback('');
    const owner = data.customer.id;
    try {
      const response = await fetch('/dev/workspace/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ ...action, customerId: owner, idempotencyKey: crypto.randomUUID() }) });
      const workspace = await readResponse(response);
      if (activeCustomer.current !== owner) return null;
      setData(workspace); setFeedback(success);
      return workspace;
    } catch (cause) {
      if (activeCustomer.current === owner) setError(cause instanceof Error ? cause.message : 'That sample action could not be saved. Try again.');
      return null;
    } finally { mutationPending.current = false; setBusy(false); }
  }

  function navigate(next: View, requestId?: string) { setView(next); setShowCatalog(false); setFeedback(''); if (requestId) setSelectedId(requestId); }
  async function addProduct(productId: string) {
    const result = await mutate({ action: 'create_sample_request', productId }, 'A new sample order is ready to explore.');
    if (result) { const previousIds = new Set(data?.requests.map(request => request.id)); setSelectedId(result.requests.find(request => !previousIds.has(request.id))?.id ?? result.requests[0]?.id ?? ''); setView('orders'); setShowCatalog(false); }
  }
  const selected = data?.requests.find(request => request.id === selectedId) ?? data?.requests[0];
  const activeOrders = data?.requests.filter(request => !['CANCELLED', 'REJECTED', 'DELIVERED'].includes(request.status)) ?? [];
  const completed = data?.requests.filter(request => request.status === 'DELIVERED').length ?? 0;
  const firstName = data?.customer.name.replace(/^SAMPLE\s+/i, '').split(' ')[0] ?? 'friend';
  // A full document navigation replaces AuthProvider when leaving the sandbox.
  const exitHref = '/';

  return <div className="dw-shell">
    <a href="#dw-main" className="dw-skip-link">Skip to workspace</a>
    <aside className="dw-sidebar" aria-label="Workspace sidebar"><a className="dw-brand" href={exitHref}><span><ParcelMark /></span>PayNShip<span className="dw-brand-dot">.</span></a><span className="dw-sidebar-label">YOUR KOREAN CONNECTION</span><nav aria-label="Customer workspace">{navigation.map(item => <button type="button" key={item.id} aria-current={view === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><WorkspaceIcon name={item.icon} /><span>{item.label}</span>{item.id === 'orders' && data && <span className="dw-nav-count">{data.requests.length}</span>}</button>)}</nav><div className="dw-sidebar-bottom"><div className="dw-sidebar-note"><JourneyArtwork /><strong>From Korea,<br />with a little care.</strong><p>Your finds. One happy journey.</p></div><button type="button" className={`dw-support-nav${view === 'support' ? ' is-active' : ''}`} onClick={() => navigate('support')}><WorkspaceIcon name="help" /> Help & support<WorkspaceIcon name="chevron" size={16} /></button><a href={exitHref} className="dw-exit-link"><WorkspaceIcon name="logout" size={17} />Back to the website</a></div></aside>
    <div className="dw-workspace"><header className="dw-topbar"><div className="dw-topbar-context"><span className="dw-live-dot" /><span>Developer sandbox</span><span className="dw-topbar-divider">/</span><span className="dw-topbar-sample">Sample data</span></div><div className="dw-customer-switch"><span className="dw-avatar">{initials(data?.customer.name ?? 'Ghost Customer')}</span><label><span>GHOST SIGN-IN</span><select aria-label="Sample customer" value={customerId} disabled={busy} onChange={event => switchCustomer(event.target.value)}>{data?.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.country}</option>) ?? <option value={customerId}>Loading sample account…</option>}</select></label></div></header>
      <main id="dw-main" className="dw-main"><div className="dw-page-heading"><div><p className="dw-eyebrow">{view === 'overview' ? `WELCOME BACK, ${firstName.toUpperCase()}` : navigation.find(item => item.id === view)?.label.toUpperCase() ?? 'HELP & SUPPORT'}</p><h1>{viewTitles[view]}</h1><p>{view === 'overview' ? 'Your finds, your funds, and every step along the way.' : view === 'orders' ? 'Take a closer look, review the estimate, and try a sample payment.' : view === 'payments' ? 'A simple view of your sample credit and payment history.' : view === 'delivery' ? 'Explore fictional packing, shipping, and delivery events.' : view === 'customs' ? 'Recorded Naver checks, destination guidance, and the information still needed.' : view === 'account' ? 'A fictional profile, with room to try things out.' : 'Keep every sample conversation with its order.'}</p></div>{!loading && data && <button className="dw-button dw-button-primary" type="button" onClick={() => { setShowCatalog(value => !value); setView('orders'); }}><WorkspaceIcon name="plus" size={18} />New sample order</button>}</div>
        {error && <div className="dw-alert dw-alert-error" role="alert"><span>{error}</span><button className="dw-text-link" type="button" disabled={busy} onClick={() => setReload(value => value + 1)}>Reload workspace</button></div>}
        {feedback && <div className="dw-alert dw-alert-success" role="status"><WorkspaceIcon name="check" size={18} />{feedback}</div>}
        {loading ? <div className="dw-loading" role="status"><span className="dw-loading-parcel"><ParcelMark /></span><h2>Unpacking your sample workspace…</h2><p>Getting your saved orders and credit ready.</p></div>
          : !data ? <div className="dw-card dw-empty-state"><WorkspaceIcon name="refresh" size={34} /><h2>Let’s try that again.</h2><p>Reload your sample workspace when the local data service is ready.</p><button type="button" className="dw-button dw-button-primary" onClick={() => setReload(value => value + 1)}>Try again</button></div>
            : <>
              {showCatalog && <ProductCatalog data={data} busy={busy} onAdd={productId => void addProduct(productId)} onClose={() => setShowCatalog(false)} />}
              {view === 'overview' && <><section className="dw-welcome-card"><div><span className="dw-small-badge">A LITTLE CLOSER TO KOREA</span><h2>Good finds.<br /><span>Great journeys.</span></h2><p>Everything you need for your next parcel,<br className="dw-desktop-break" /> all neatly packed into one place.</p><button className="dw-button dw-button-light" type="button" onClick={() => navigate('orders')}>Explore your orders <WorkspaceIcon name="arrow" size={18} /></button></div><JourneyArtwork /><span className="dw-welcome-stamp">PACKED<br /><strong>WITH CARE</strong><svg viewBox="0 0 40 20" aria-hidden="true"><path d="M6 5h.1M33 5h.1M10 9q10 13 20 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span></section><section className="dw-stats" aria-label="Account overview"><Stat icon="wallet" label="Sample credit balance" value={dollars(data.account.balanceCents)} detail="USD · ready for sample payments" tone="blue" /><Stat icon="orders" label="Orders in progress" value={String(activeOrders.length).padStart(2, '0')} detail="Active sample orders" tone="peach" /><Stat icon="check" label="Happy arrivals" value={String(completed).padStart(2, '0')} detail="Fictional delivered parcels" tone="green" /></section><div className="dw-overview-grid"><section className="dw-card dw-recent-orders"><div className="dw-card-heading"><div><p className="dw-eyebrow">THE LATEST ON YOUR FINDS</p><h2>Your recent orders</h2></div><button type="button" className="dw-text-link" onClick={() => navigate('orders')}>View all <WorkspaceIcon name="arrow" size={16} /></button></div><OrderRows requests={data.requests.slice(0, 4)} onSelect={id => navigate('orders', id)} /></section><aside className="dw-card dw-next-card"><span className="dw-icon-tile dw-icon-peach"><WorkspaceIcon name="orders" size={26} /></span><p className="dw-eyebrow">YOUR NEXT GOOD FIND</p><h2>A little something <br />from Korea?</h2><p>Choose a prepared Naver sample to explore a fresh order, its estimate, and the journey after payment.</p><div className="dw-mini-products">{data.products.slice(0, 3).map(product => <ProductArtwork key={product.id} name={product.name} compact />)}</div><button className="dw-button dw-button-outline" type="button" onClick={() => { setView('orders'); setShowCatalog(true); }}>Browse sample finds <WorkspaceIcon name="arrow" size={17} /></button></aside></div></>}
              {view === 'orders' && <div className="dw-orders-grid"><section className="dw-card dw-order-list"><div className="dw-card-heading"><h2>All your finds <span className="dw-count">{data.requests.length}</span></h2><span className="dw-muted">Saved locally</span></div><div className="dw-order-options">{data.requests.map(request => <button className={`dw-order-option${selected?.id === request.id ? ' is-selected' : ''}`} type="button" key={request.id} aria-pressed={selected?.id === request.id} onClick={() => setSelectedId(request.id)}><ProductArtwork name={request.productName} compact /><span><span className="dw-order-ref">{shortReference(request.id)}</span><strong>{request.productName}</strong><SampleStatus request={request} /></span><WorkspaceIcon name="chevron" size={17} /></button>)}</div>{!data.requests.length && <div className="dw-empty-state"><h3>Your first find is waiting.</h3><p>Start with one of the prepared sample products.</p></div>}</section>{selected && <OrderDetail request={selected} balanceCents={data.account.balanceCents} busy={busy} onPay={() => void mutate({ action: 'pay', requestId: selected.id, version: selected.version }, 'Sample payment completed. Your credit balance and order are updated.')} onTopUp={() => void mutate({ action: 'top_up', amountCents: 10000 }, '$100 in sample credit added to this account.')} onCancel={() => void mutate({ action: 'cancel_request', requestId: selected.id, version: selected.version }, 'Sample request cancelled.')} onDelivery={() => navigate('delivery', selected.id)} />}</div>}
              {view === 'payments' && <PaymentsPanel data={data} busy={busy} onTopUp={() => void mutate({ action: 'top_up', amountCents: 10000 }, '$100 in sample credit added to this account.')} onOrder={id => navigate('orders', id)} />}
              {view === 'delivery' && <DeliveryPanel data={data} selected={selected} busy={busy} onSelect={setSelectedId} onAdvance={request => void mutate({ action: 'advance_delivery', requestId: request.id, version: request.version }, 'The next fictional delivery event is saved.')} onOrders={() => navigate('orders')} onAccount={() => navigate('account')} />}
              {view === 'customs' && <WorkspaceCustoms data={data} />}
              {view === 'account' && <AccountPanel key={data.customer.id} data={data} busy={busy} onSave={async delivery => Boolean(await mutate({ action: 'save_delivery', delivery }, 'Sample delivery address saved.'))} />}
              {view === 'support' && <SupportPanel key={data.customer.id} data={data} busy={busy} onSend={async (requestId, subject, message) => Boolean(await mutate({ action: 'support', requestId, subject, message }, 'Sample support message saved with your order.'))} />}
            </>}
        <footer className="dw-footer"><span>PayNShip · Korea, delivered.</span><span>Local sample database · Changes survive refresh</span></footer>
      </main>
    </div>
  </div>;
}

function Stat({ icon, label, value, detail, tone }: { icon: WorkspaceIconName; label: string; value: string; detail: string; tone: string }) {
  return <article className="dw-stat"><span className={`dw-icon-tile dw-icon-${tone}`}><WorkspaceIcon name={icon} size={22} /></span><div><h2>{label}</h2><strong>{value}</strong><p>{detail}</p></div></article>;
}

function OrderRows({ requests, onSelect }: { requests: SampleRequest[]; onSelect: (id: string) => void }) {
  return <div className="dw-order-rows">{requests.map(request => <button key={request.id} type="button" className="dw-order-row" onClick={() => onSelect(request.id)}><ProductArtwork name={request.productName} compact /><span className="dw-order-row-name"><span className="dw-order-ref">{shortReference(request.id)}</span><strong>{request.productName}</strong><span>{COUNTRY_LABELS[request.destination]} · {workspaceDate(request.createdAt)}</span></span><span className="dw-order-row-status"><SampleStatus request={request} /><strong>{request.quote ? dollars(request.quote.subtotalCents) : 'Estimate pending'}</strong></span><WorkspaceIcon name="chevron" size={17} /></button>)}{!requests.length && <p className="dw-muted">Your new sample orders will appear here.</p>}</div>;
}

function ProductCatalog({ data, busy, onAdd, onClose }: { data: WorkspaceData; busy: boolean; onAdd: (id: string) => void; onClose: () => void }) {
  return <section className="dw-card dw-catalog" aria-label="Sample product catalog"><div className="dw-card-heading"><div><p className="dw-eyebrow">A FEW KOREAN FINDS</p><h2>Pick your next sample.</h2></div><button type="button" className="dw-text-link" onClick={onClose}>Close</button></div><div className="dw-catalog-grid">{data.products.map(product => <article key={product.id}><ProductArtwork name={product.name} /><div><span className="dw-retailer"><span aria-hidden="true">N</span> Naver · Fictional estimate</span><h3>{product.name}</h3><p>₩{product.estimatedPriceKrw.toLocaleString('en-US')} <span>sample product estimate</span></p><button type="button" className="dw-button dw-button-outline" disabled={busy} onClick={() => onAdd(product.id)}>Create sample order<WorkspaceIcon name="plus" size={16} /></button></div></article>)}</div><p className="dw-fine-print">Product names are scenario labels. Listing prices, availability, materials and customs classifications have not been verified.</p></section>;
}
