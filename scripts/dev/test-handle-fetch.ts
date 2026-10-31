import 'dotenv/config';
import { getProductByHandle } from '../../lib/shopify/queries-v2/product';
async function main() {
  const h = '나이키-팬텀-gx-2-프로-tffj2583003';
  const p = await getProductByHandle(h);
  console.log('handle:', h);
  console.log('result:', p ? { id: p.id, title: p.title, status: p.status, variants: p.variants.length } : null);
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
