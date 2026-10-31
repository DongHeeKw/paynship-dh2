/**
 * PayNShip v2.1 — Products webhook handlers
 *
 * MVP는 로그만. 향후 Mirror 가격/재고 sync 추가 예정.
 */

import logger from '@/lib/utils/logger';

export interface ShopifyProductPayload {
  id: number;
  handle: string;
  title: string;
  status: string;
  updated_at?: string;
  variants?: Array<{
    id: number;
    price: string;
    inventory_quantity?: number;
    sku?: string | null;
  }>;
}

/**
 * products/update handler.
 * MVP: log만.
 * 향후: Prisma mirror 존재 시 가격/재고 sync.
 */
export async function handleProductUpdate(payload: ShopifyProductPayload): Promise<void> {
  logger.info(
    'WebhookV2Products',
    `Product updated — id=${payload.id} handle=${payload.handle} status=${payload.status} variants=${payload.variants?.length ?? 0}`,
  );
  // TODO Phase 2:
  //  - Prisma ShopifyProductMirror 조회 (shopifyProductId로)
  //  - 가격/재고 변동 감지
  //  - 활성 Cart에 priceChangedAt flag
}
