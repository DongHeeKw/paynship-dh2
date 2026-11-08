import SiteShell from '@/components/site/SiteShell';
import { getDemoData } from '@/lib/demo/data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo data — PayNShip', robots: 'noindex, nofollow' };

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'Demo data could not be loaded.';
}

export default async function DemoPage() {
  let data;
  let loadError = '';
  try {
    data = await getDemoData();
  } catch (error) {
    loadError = messageOf(error);
  }

  const customers = new Map(data?.customers.map(customer => [customer.id, customer]) ?? []);
  const products = new Map(data?.products.map(product => [product.id, product]) ?? []);

  return <SiteShell>
    <div className="page-content demo-page">
      <header className="page-heading">
        <p className="eyebrow">DATABASE DEMO</p>
        <h1>Sample data</h1>
        <p>This page reads synthetic examples from Supabase. It does not show real users, live products, real prices, orders, or tracking events.</p>
      </header>

      {loadError ? <section className="notice" role="status">
        <h2 className="section-heading">Demo tables are not ready</h2>
        <p>{loadError}</p>
        <p>Run <code>prisma/sql/2026-11-08-demo-data.sql</code> in the Supabase SQL Editor, then refresh this page.</p>
      </section> : <>
        <section className="detail-section" aria-labelledby="demo-products-heading">
          <h2 id="demo-products-heading" className="section-heading">Sample products</h2>
          <div className="demo-grid">
            {data?.products.map(product => <article className="demo-card" key={product.id}>
              <span className="status-label">DEMO ONLY</span>
              <h3>{product.title}</h3>
              <p>{product.merchant} · {product.category}</p>
              <p className="demo-price">₩{product.price_krw.toLocaleString('ko-KR')}</p>
              <p className="muted">{product.note}</p>
            </article>)}
          </div>
          {data?.products.length === 0 && <p className="muted">No demo products yet.</p>}
        </section>

        <section className="detail-section" aria-labelledby="demo-customers-heading">
          <h2 id="demo-customers-heading" className="section-heading">Fictional customers</h2>
          <ul className="demo-list">
            {data?.customers.map(customer => <li key={customer.id}>
              <strong>{customer.display_name}</strong><span>{customer.destination_country}</span>
            </li>)}
          </ul>
          {data?.customers.length === 0 && <p className="muted">No demo customers yet.</p>}
          <p className="muted">These are database fixtures, not Supabase Auth accounts and cannot sign in.</p>
        </section>

        <section className="detail-section" aria-labelledby="demo-shipments-heading">
          <h2 id="demo-shipments-heading" className="section-heading">Sample shipment statuses</h2>
          <div className="demo-grid">
            {data?.shipments.map(shipment => <article className="demo-card" key={shipment.id}>
              <span className="status-label">SAMPLE_ONLY</span>
              <h3>{customers.get(shipment.customer_id)?.display_name ?? 'Unknown demo customer'}</h3>
              <p>{products.get(shipment.product_id)?.title ?? 'Unknown demo product'}</p>
              <p><strong>{shipment.status}</strong></p>
              <p className="muted">{shipment.carrier_label} · {shipment.tracking_label}</p>
            </article>)}
          </div>
          {data?.shipments.length === 0 && <p className="muted">No demo shipments yet.</p>}
        </section>
      </>}
    </div>
  </SiteShell>;
}
