/**
 * Shopify Manual Sync API
 *
 * POST /api/admin/shopify/sync
 * - 전체 동기화: { type: 'all' }
 * - 단일 상품: { type: 'single', productId: string }
 * - 미동기화 상품만: { type: 'unsynced' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/helpers';
import { prisma } from '@/lib/db/prisma';
import { isShopifyEnabled } from '@/lib/shopify/config';
import { syncProductToShopify } from '@/lib/shopify/products';
import { getExchangeRate } from '@/lib/calculator/exchange-rate';
import { extractRequestMeta, getRequestPathname, recordAdminAuditLog } from '@/lib/admin';
import logger from '@/lib/utils/logger';

interface SyncRequest {
  type: 'all' | 'single' | 'unsynced' | 'batch';
  productId?: string;       // For 'single' type
  productIds?: string[];    // For 'batch' type
  limit?: number;
}

export async function POST(req: NextRequest) {
  try {
    // Admin 권한 확인
    const { user, error, isAdmin, adminRole } = await requireAdmin('operator');
    if (error || !isAdmin) {
      return NextResponse.json(
        {
          error: error || 'Admin access required',
          code: 'ADMIN_ROLE_REQUIRED',
          minimumRole: 'operator',
          currentRole: adminRole ?? null,
        },
        { status: 403 }
      );
    }

    // Shopify 활성화 확인
    const enabled = await isShopifyEnabled();
    if (!enabled) {
      return NextResponse.json(
        { error: 'Shopify integration is disabled. Enable it in Admin Settings first.' },
        { status: 400 }
      );
    }

    const body: SyncRequest = await req.json();
    const { type, productId, productIds, limit = 50 } = body;

    if (!type) {
      return NextResponse.json({ error: 'sync type is required' }, { status: 400 });
    }

    let products;
    let syncType: string;

    switch (type) {
      case 'single':
        if (!productId) {
          return NextResponse.json({ error: 'productId is required for single sync' }, { status: 400 });
        }
        const singleProduct = await prisma.product.findUnique({
          where: { id: productId },
        });
        products = singleProduct ? [singleProduct] : [];
        syncType = 'single';
        break;

      case 'unsynced':
        products = await prisma.product.findMany({
          where: { canonicalProductId: null },
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        syncType = 'unsynced';
        break;

      case 'all':
        products = await prisma.product.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        syncType = 'all';
        break;

      case 'batch':
        if (!productIds || productIds.length === 0) {
          return NextResponse.json({ error: 'productIds is required for batch sync' }, { status: 400 });
        }
        products = await prisma.product.findMany({
          where: { id: { in: productIds } },
        });
        syncType = 'batch';
        break;

      default:
        return NextResponse.json({ error: 'Invalid sync type' }, { status: 400 });
    }

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        syncType,
        message: '동기화할 상품이 없습니다',
        stats: { total: 0, synced: 0, failed: 0, skipped: 0 },
      });
    }

    // 동기화 실행
    const results = {
      total: products.length,
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: [] as { productId: string; error: string }[],
    };

    const startTime = Date.now();

    // 환율은 루프 전에 한 번만 조회 (Mock/API/Cache 자동 처리)
    const exchangeRate = await getExchangeRate();
    logger.debug(`[Shopify Sync] Using exchange rate: ${exchangeRate}`);

    for (const product of products) {
      try {
        const result = await syncProductToShopify(product, {
          exchangeRate,
        });

        if (result.isNew) {
          results.synced++;
        } else {
          results.skipped++; // 이미 동기화됨
        }
      } catch (err) {
        results.failed++;
        results.errors.push({
          productId: product.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        logger.error(`[Shopify Sync] Failed for product ${product.id}:`, err);
      }
    }

    const duration = Date.now() - startTime;

    // 동기화 시간 업데이트
    await prisma.adminSettings.updateMany({
      data: {
        shopifyLastSyncAt: new Date(),
        shopifyLastError: results.failed > 0
          ? `${results.failed}개 상품 동기화 실패`
          : null,
      },
    });

    // 통계 업데이트
    const [syncedCount, canonicalCount] = await Promise.all([
      prisma.product.count({ where: { shopifyProductId: { not: null } } }),
      prisma.canonicalProduct.count(),
    ]);

    await prisma.adminSettings.updateMany({
      data: {
        shopifySyncedProductCount: syncedCount,
        shopifyCanonicalCount: canonicalCount,
      },
    });

    logger.debug(`[Shopify Sync] Completed: ${results.synced} synced, ${results.failed} failed, ${results.skipped} skipped (${duration}ms)`);

    await recordAdminAuditLog({
      adminUserId: user?.id ?? null,
      adminUserEmail: user?.email ?? null,
      action: 'RUN_SHOPIFY_SYNC',
      target: 'shopify_sync',
      changes: [
        { field: 'syncType', before: null, after: syncType },
        { field: 'total', before: null, after: results.total },
        { field: 'synced', before: null, after: results.synced },
        { field: 'failed', before: null, after: results.failed },
        { field: 'skipped', before: null, after: results.skipped },
        { field: 'durationMs', before: null, after: duration },
      ],
      requestMeta: extractRequestMeta(req.headers, getRequestPathname(req)),
    });

    return NextResponse.json({
      success: results.failed === 0,
      syncType,
      message: `${results.synced}개 상품 동기화 완료${results.failed > 0 ? `, ${results.failed}개 실패` : ''}`,
      stats: {
        total: results.total,
        synced: results.synced,
        failed: results.failed,
        skipped: results.skipped,
        duration,
      },
      errors: results.errors.length > 0 ? results.errors.slice(0, 10) : undefined, // 최대 10개 에러만 반환
    });
  } catch (error) {
    logger.error('[Shopify Sync API Error]', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
