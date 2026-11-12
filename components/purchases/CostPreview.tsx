'use client';

import { useEffect, useId, useState } from 'react';
import type { IntakeDraft } from '@/lib/purchases/intake-draft';
import { publicCostEstimate, publishedOptions } from '@/lib/purchases/public-estimate';
import './cost-preview.css';

const won = (amount: number | null) => amount === null ? 'Needs review' : new Intl.NumberFormat('en', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(amount);

export default function CostPreview({ draft, onChange, disabled = false }: { draft: IntakeDraft; onChange: (patch: Partial<IntakeDraft>) => void; disabled?: boolean }) {
  const id = useId();
  const [enteredPrice, setEnteredPrice] = useState('');
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { setEnteredPrice(''); }, [draft.sourceUrl, draft.options]);
  const validPrice = /^[1-9]\d{0,8}$/.test(enteredPrice) && Number(enteredPrice) <= 100_000_000;
  const estimate = publicCostEstimate({ ...draft, enteredUnitPriceKrw: validPrice ? Number(enteredPrice) : undefined }, now ?? NaN);
  const options = publishedOptions(draft.sourceUrl);
  return <section className="cost-preview" aria-labelledby={`${id}-title`}>
    <div className="cost-preview-heading"><div><span className="cost-eyebrow">KNOW YOUR COSTS</span><h2 id={`${id}-title`}>Before you place a request.</h2></div><span className="cost-badge">15% service fee</span></div>
    <p>Our fee is <strong>15% of the product subtotal, minimum ₩10,000 per retailer order</strong>. The minimum applies once to the quantity purchased together. Shipping and import charges are separate.</p>
    {options.length > 0 && <div className="field"><label htmlFor={`${id}-variant`}>Published product options</label><select id={`${id}-variant`} disabled={disabled} value={options.some(item => item.options === draft.options) ? draft.options : ''} onChange={event => onChange({ options: event.target.value })}><option value="">Choose the exact size, colour and model</option>{options.map((item, index) => <option key={`${item.sku}-${index}`} value={item.options}>{item.options}</option>)}</select></div>}
    {estimate.priceSource !== 'VERIFIED' && <div className="field"><label htmlFor={`${id}-price`}>Seller’s unit price in KRW (optional)</label><input id={`${id}-price`} disabled={disabled} inputMode="numeric" autoComplete="off" maxLength={9} value={enteredPrice} placeholder="e.g. 100000" onChange={event => setEnteredPrice(event.target.value)} aria-describedby={`${id}-price-hint`} aria-invalid={Boolean(enteredPrice && !validPrice)} /><small id={`${id}-price-hint`}>{enteredPrice && !validPrice ? 'Enter a whole-won price from ₩1 to ₩100,000,000, without commas.' : 'Use the price for your exact options after seller discounts. This calculates the service fee; we still verify the price.'}</small></div>}
    <dl className="cost-lines" aria-live="polite" aria-atomic="true">
      <div><dt>Products × {Number.isInteger(draft.quantity) ? draft.quantity : '—'}</dt><dd>{won(estimate.productSubtotalKrw)}</dd></div>
      <div><dt>PayNShip service fee</dt><dd>{won(estimate.serviceFeeKrw)}</dd></div>
      <div className="cost-subtotal"><dt>Products + service only</dt><dd>{won(estimate.productAndServiceKrw)}</dd></div>
      <div><dt>Shipping within Korea</dt><dd>{won(estimate.domesticShippingKrw)}</dd></div>
      <div><dt>International shipping</dt><dd>{won(estimate.internationalShippingKrw)}</dd></div>
      <div><dt>Insurance</dt><dd>{won(estimate.insuranceKrw)}</dd></div>
      <div><dt>Import duty</dt><dd>{won(estimate.dutyKrw)}</dd></div>
      <div><dt>Import taxes</dt><dd>{won(estimate.taxKrw)}</dd></div>
      <div><dt>Customs clearance</dt><dd>{won(estimate.clearanceKrw)}</dd></div>
      <div className="cost-total"><dt>Estimated delivered total</dt><dd>{estimate.totalKrw === null ? 'Not ready yet' : won(estimate.totalKrw)}</dd></div>
    </dl>
    <p className="cost-note">{estimate.priceSource === 'CUSTOMER' && 'Based on the price you entered. '}{estimate.reason}</p>
    {estimate.expiresAt && <p className="cost-note">Estimate expires {new Date(estimate.expiresAt).toISOString()}.</p>}
    <details><summary>What the service fee covers</summary><p>Purchasing, checking the requested options, receiving, basic inspection and ordinary packing. Special handling is quoted separately before approval.</p><p>One request currently covers one product and its quantity. Requests are separate retailer orders; combining different products into one checkout is not available yet. Do not split a combined retailer checkout to apply the minimum repeatedly.</p><p>Launch destinations: USA, China and Japan. We verify where the product was made; shipping from Korea does not prove Korean origin. No payment takes place on this screen.</p></details>
  </section>;
}
