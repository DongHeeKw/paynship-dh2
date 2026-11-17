import evidence from '@/data/samples/naver-customs-readiness-2026-11-15.json';
import { countryPolicyNeedsRefresh, getCountryCustomsPolicy } from '@/lib/customs/country-policy';
import type { WorkspaceData } from '@/features/workspace/core/types';
import { COUNTRY_LABELS } from './format';
import { WorkspaceIcon } from './WorkspaceArt';

const fieldLabels: Record<string, string> = {
  name: 'Verified item name', price: 'Seller price', priceCurrency: 'Price currency', sku: 'SKU / variant',
  countryOfOrigin: 'Country of manufacture', material: 'Materials', packagedWeightKg: 'Packed weight',
  packagedDimensionsCm: 'Packed dimensions', hsCode: 'Reviewed HS classification',
};
const sourceLinks = {
  CN: { title: 'China Customs express-clearance guide', url: 'https://online.customs.gov.cn/static/pages/guides/000629017002/000629017002.html' },
  JP: { title: 'Japan Customs personal-import procedures', url: 'https://www.customs.go.jp/english/c-answer_e/kojin/3002_e.htm' },
  US: { title: 'US importer identification: 19 CFR 24.5', url: 'https://www.ecfr.gov/current/title-19/chapter-I/part-24/section-24.5' },
};

export default function WorkspaceCustoms({ data, now = Date.now() }: { data: Pick<WorkspaceData, 'customer'>; now?: number }) {
  const country = data.customer.country;
  const policy = getCountryCustomsPolicy(country);
  const overdue = countryPolicyNeedsRefresh(country, now);
  const reference = sourceLinks[country];
  return <div className="dw-customs-workspace">
    <section className="dw-card dw-customs-intro">
      <div className="dw-card-heading"><div><p className="dw-eyebrow">KOREA → {COUNTRY_LABELS[country].toUpperCase()}</p><h2>Know what still needs a review.</h2></div><span className="dw-small-badge">Evidence required</span></div>
      <p className="dw-muted">A product link and an address start a request. They do not establish its customs eligibility. These checks keep the missing evidence visible.</p>
      {overdue && <p className="dw-notice" role="status"><strong>Built-in customs guidance needs review.</strong> The internal review deadline was <time dateTime={policy.reviewDueAt ?? undefined}>{policy.reviewDueAt?.slice(0, 10)} UTC</time>. Live quote approval, checkout, purchasing and dispatch remain blocked until the policy is reviewed. Fictional workspace actions remain available. This deadline is an internal control, not a law’s expiry date.</p>}
      <div className="dw-customs-checks">
        <Check title="Product & package" status="Missing verified facts">Confirm the exact option, seller invoice, origin, materials and measured final parcel. HS classification needs an operator or broker review.</Check>
        <Check title="Carrier & recipient" status="Route not connected">Confirm a contracted carrier/broker and entry route. If identity documents are needed, the recipient supplies them through that provider’s secure process.</Check>
        <Check title="Duty & tax" status="Amounts unknown">The wallet examples cover a fictional service subtotal. Unknown duty and tax are excluded; sample payment is not a customs approval.</Check>
        <Check title="Customs outcome" status="No provider release record">A recorded review, a matching tracking reference and actual customs release are different events. No live customs case is connected here.</Check>
      </div>
      <div className="dw-customs-country"><h3>{COUNTRY_LABELS[country]} recipient guidance</h3><p>{policy.customerHint}</p><a className="dw-text-link" href={reference.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{reference.title} ↗</a><p className="dw-fine-print">Recorded guidance was checked October 18, 2026. A new product URL check does not refresh these rules or approve a product, broker or shipping route.</p></div>
    </section>
    <section className="dw-card" aria-labelledby="dw-live-evidence-heading">
      <div className="dw-card-heading"><div><p className="dw-eyebrow">ACTUAL NAVER URL CHECK · {evidence.auditDateKst}</p><h2 id="dw-live-evidence-heading">What the collector could verify.</h2></div><span className="dw-count">{evidence.products.length} URLs</span></div>
      <p className="dw-muted">All four live checks reached Naver’s robots policy and were refused before a product-page request. No product name, price or customs fact was collected. The item descriptions and prices elsewhere in this workspace remain fictional estimates.</p>
      <div className="dw-customs-evidence">{evidence.products.map(product => {
        const url = new URL(product.sourceUrl);
        return <article key={product.sourceUrl}>
          <div><a className="dw-text-link" href={product.sourceUrl} target="_blank" rel="noopener noreferrer">{url.hostname}{url.pathname} ↗</a><span className="dw-status dw-status-waiting">Collection blocked by robots policy</span></div>
          <p>Verified fields: {Object.keys(product.fields).length} · Product page not requested · Customs review required</p>
          <ul aria-label="Missing product evidence">{product.missingFields.map(field => <li key={field}>{fieldLabels[field] ?? field}</li>)}</ul>
        </article>;
      })}</div>
    </section>
    <section className="dw-card dw-customs-pccc"><WorkspaceIcon name="help" size={26} /><div><h2>There is no universal “foreign PCCC”.</h2><p>Korea’s PCCC concerns goods entering Korea. This workspace models exports from Korea; the destination’s carrier/broker determines applicable recipient requirements. Do not put PCCC, SSN, passport numbers or ID images in support messages.</p><a className="dw-text-link" href="https://customs.go.kr/english/cm/cntnts/cntntsView.do?cntntsId=5502" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Korea Customs Service guidance ↗</a></div></section>
  </div>;
}

function Check({ title, status, children }: { title: string; status: string; children: React.ReactNode }) {
  return <article><WorkspaceIcon name="orders" size={21} /><h3>{title}</h3><strong>{status}</strong><p>{children}</p></article>;
}
