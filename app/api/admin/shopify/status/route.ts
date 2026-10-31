/**
 * Shopify Status API
 *
 * GET /api/admin/shopify/status
 * - 환경변수 설정 확인
 * - API 연결 테스트
 * - 통계 정보 반환
 */

import { NextResponse } from 'next/server';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { prisma } from '@/lib/db/prisma';
import { isShopifyConfigured, SHOPIFY_CONFIG, getGraphQLEndpoint } from '@/lib/shopify/config';
import logger from '@/lib/utils/logger';

export async function GET() {
  try {
    // Admin 권한 확인
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    // 환경변수 설정 확인
    const isConfigured = isShopifyConfigured();
    const hasStoreDomain = !!SHOPIFY_CONFIG.storeDomain;
    const hasAccessToken = !!SHOPIFY_CONFIG.adminAccessToken;

    if (!isConfigured) {
      return NextResponse.json({
        status: 'not_configured',
        message: '환경 변수가 설정되지 않았습니다',
        envCheck: {
          SHOPIFY_STORE_DOMAIN: hasStoreDomain,
          SHOPIFY_ADMIN_ACCESS_TOKEN: hasAccessToken,
        },
        stats: null,
      });
    }

    // API 연결 테스트
    let apiConnected = false;
    let apiError: string | null = null;
    let shopInfo: { name: string; domain: string } | null = null;

    try {
      const response = await fetch(getGraphQLEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_CONFIG.adminAccessToken!,
        },
        body: JSON.stringify({
          query: `{ shop { name primaryDomain { host } } }`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.shop) {
          apiConnected = true;
          shopInfo = {
            name: data.data.shop.name,
            domain: data.data.shop.primaryDomain?.host || SHOPIFY_CONFIG.storeDomain,
          };
        } else if (data.errors) {
          apiError = data.errors[0]?.message || 'API returned errors';
        }
      } else {
        apiError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (err) {
      apiError = err instanceof Error ? err.message : 'Unknown error';
    }

    // DB 통계 조회
    const [canonicalCount, productCount, settings] = await Promise.all([
      prisma.canonicalProduct.count(),
      prisma.product.count({
        where: { shopifyProductId: { not: null } },
      }),
      prisma.adminSettings.findFirst({
        select: {
          shopifyEnabled: true,
          shopifyAutoSync: true,
          shopifyLastSyncAt: true,
          shopifyLastError: true,
        },
      }),
    ]);

    // AdminSettings 업데이트 (연결 상태)
    const connectionStatus = apiConnected ? 'connected' : (apiError ? 'error' : 'disconnected');
    await prisma.adminSettings.updateMany({
      data: {
        shopifyConnectionStatus: connectionStatus,
        shopifySyncedProductCount: productCount,
        shopifyCanonicalCount: canonicalCount,
        ...(apiError && { shopifyLastError: apiError }),
      },
    });

    return NextResponse.json({
      status: connectionStatus,
      message: apiConnected
        ? `${shopInfo?.name || 'Shopify Store'}에 연결됨`
        : apiError || '연결되지 않음',
      envCheck: {
        SHOPIFY_STORE_DOMAIN: hasStoreDomain,
        SHOPIFY_ADMIN_ACCESS_TOKEN: hasAccessToken,
      },
      shopInfo,
      stats: {
        canonicalCount,
        syncedProductCount: productCount,
        enabled: settings?.shopifyEnabled ?? false,
        autoSync: settings?.shopifyAutoSync ?? true,
        lastSyncAt: settings?.shopifyLastSyncAt?.toISOString() || null,
        lastError: apiError || settings?.shopifyLastError || null,
      },
    });
  } catch (error) {
    logger.error('[Shopify Status API Error]', error);
    return NextResponse.json(
      { error: 'Failed to check Shopify status' },
      { status: 500 }
    );
  }
}
