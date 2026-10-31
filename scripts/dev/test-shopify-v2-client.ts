/**
 * DEV — v2.1 Shopify Admin client 작동 확인 (shop info + first product query).
 */
import 'dotenv/config';
import { shopifyV2Gql } from '../../lib/shopify/admin-v2';
import { getProductByHandle } from '../../lib/shopify/queries-v2/product';

async function main() {
  const shop = await shopifyV2Gql<{ shop: { name: string; currencyCode: string; primaryDomain: { host: string } } }>(
    `{ shop { name currencyCode primaryDomain { host } } }`,
  );
  console.log('Shop:', shop.shop);

  // 첫 상품 조회 (handle 알 수 없으니 list로)
  const list = await shopifyV2Gql<{ products: { edges: Array<{ node: { handle: string; title: string; status: string } }> } }>(
    `{ products(first: 5) { edges { node { handle title status } } } }`,
  );
  console.log('\nFirst 5 products:');
  if (list.products.edges.length === 0) {
    console.log('  (empty — no products in store)');
  } else {
    for (const { node } of list.products.edges) {
      console.log(`  - ${node.handle} : ${node.title} [${node.status}]`);
    }

    // 첫 상품 상세 조회
    const firstHandle = list.products.edges[0].node.handle;
    const detail = await getProductByHandle(firstHandle);
    console.log(`\nDetail for ${firstHandle}:`);
    console.log(`  title: ${detail?.title}`);
    console.log(`  vendor: ${detail?.vendor}`);
    console.log(`  status: ${detail?.status}`);
    console.log(`  variants: ${detail?.variants.length}`);
    console.log(`  images: ${detail?.images.length}`);
    console.log(`  metafields: ${detail?.metafields.length}`);
  }
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
