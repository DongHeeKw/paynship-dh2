import type { Metadata } from 'next';
import Link from 'next/link';
import SiteShell from '@/components/site/SiteShell';
export const metadata: Metadata = { title: 'Small reseller purchase API | PayNShip', description: 'Submit and monitor reviewed Korean product requests using your verified account.' };

export default function Developers() {
  return <SiteShell><article className="page-content reading-guide form-stack">
    <p className="eyebrow">FOR SMALL SHOPS &amp; COLLECTORS</p><h1>One request API. The same careful review.</h1>
    <p>Connect your shop’s tooling to purchase requests. Each item goes through product, destination and quote review before payment. API access uses a verified account’s short-lived Supabase access token; your account owns every request it creates.</p>
    <h2>Start with your account</h2><p><Link href="/signup">Create an account</Link>, verify your email and save your delivery details. Use an access token obtained through the configured Supabase Auth project. Keep tokens on your server; never put them in a public page or URL.</p>
    <h2>Create a request</h2><p><code>POST /api/reseller/requests</code> with <code>Authorization: Bearer YOUR_ACCESS_TOKEN</code> and <code>Content-Type: application/json</code>.</p>
    <pre style={{ overflowX: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify({ sourceUrl: 'https://www.yes24.com/product/goods/109196213', category: 'collectibles', quantity: 1, options: 'Proof Compact Edition', idempotencyKey: 'replace-with-a-new-UUID' }, null, 2)}</pre>
    <p>Generate one UUID per request and reuse it only when retrying the same body. Do not supply a user ID or destination in the request: ownership comes from the verified token, and the destination comes from your saved delivery profile.</p>
    <h2>Follow your requests</h2><p><code>GET /api/reseller/requests</code> returns your requests, quotes and recorded status. Pass the returned <code>nextCursor</code> as <code>?cursor=UUID</code> for the next page.</p>
    <h2>Limits and pricing</h2><p>Up to 10 units per request, five active requests and 20 submissions per account per day. The request body limit is 8 KiB. Shared traffic limits also apply; use bounded retries after 429 responses. The service fee is 15% of merchandise value, with no minimum. Review and payment protections are the same as the customer website.</p>
    <p className="notice">This API submits requests for review. It does not automatically purchase goods or establish reseller customs eligibility. Live access requires configured account, database and request-protection services.</p>
  </article></SiteShell>;
}
