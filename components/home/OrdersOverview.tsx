'use client';
import Link from 'next/link';
import { useHomeOrders } from './HomeOrdersProvider';
import { CATEGORY_LABELS, countryName, formatDate } from '@/components/purchases/labels';
import type { ProductCategory } from '@/lib/purchases/categories';

export default function OrdersOverview() {
  const { data, loading, error, retry } = useHomeOrders();
  if (loading) return <section className="home-orders notice" aria-label="Your orders"><p role="status">Checking your orders…</p></section>;
  if (error) return <section className="home-orders notice" aria-label="Your orders"><p role="alert">We couldn’t load your orders. This does not mean you have no orders.</p><button className="text-button" onClick={retry}>Try again</button> · <Link href="/orders">Open orders</Link></section>;
  if (!data?.activeCount) return null;
  return <section className="home-orders" aria-labelledby="home-orders-title">
    <div className="home-section-heading"><div><p className="commerce-kicker">YOUR NEXT STEP</p><h2 id="home-orders-title">Your orders, at a glance.</h2>
      <p>{data.activeCount} active · {data.attentionCount} needing attention</p></div><Link href="/orders">View all orders</Link></div>
    <div className="home-order-grid">{data.orders.map((order) => <article key={order.id} className={order.needsAttention ? 'home-order needs-attention' : 'home-order'}>
      <span className="status-label">{order.statusLabel}</span><h3>{CATEGORY_LABELS[order.category as ProductCategory] ?? 'Your product'}</h3>
      <p>{countryName(order.destination)} · {order.quantity} item{order.quantity === 1 ? '' : 's'}</p>
      <p>{order.lastEventAt ? <>Latest recorded event: <time dateTime={order.lastEventAt}>{formatDate(order.lastEventAt)}</time></> : 'No recorded progress event yet.'}</p>
      <p>Delivery estimate pending</p><Link href={`/orders/${order.id}`}>{order.action}</Link>
    </article>)}</div>
  </section>;
}
