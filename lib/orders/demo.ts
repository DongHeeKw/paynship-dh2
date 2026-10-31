export const MOCK_SHOPIFY_ORDER_PREFIX = 'mock_order_';

export function isDemoShopifyOrderId(shopifyOrderId: string | null | undefined): boolean {
  if (!shopifyOrderId) return false;
  return shopifyOrderId.startsWith(MOCK_SHOPIFY_ORDER_PREFIX);
}
