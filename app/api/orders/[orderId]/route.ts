/**
 * Order Detail API
 * GET - Get order details
 * PATCH - Disabled (admin-only updates must go through /api/admin/orders/[id])
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/helpers';
import logger from '@/lib/utils/logger';
import { isDemoShopifyOrderId } from '@/lib/orders/demo';

export interface OrderDetail {
  id: string;
  status: string;
  isDemo: boolean;
  trackingNumber: string | null;
  shopifyOrderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  quote: {
    id: string;
    productName: string | null;
    productSnapshot: unknown;
    cartSnapshot: unknown;
    destinationCountry: string;
    destinationAddress: unknown;
    productPriceUsd: number;
    serviceFee: number;
    domesticShippingUsd: number;
    internationalShipping: number;
    customsDuty: number;
    vat: number;
    totalUsd: number;
    exchangeRate: number;
  };
}

/**
 * GET /api/orders/[orderId]
 * Get order details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const { user, isGuest } = await getAuthUser();

    if (isGuest || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        quote: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: '주문을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Check ownership or admin access
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin && order.quote?.userId !== user.id) {
      return NextResponse.json(
        { error: '권한이 없습니다' },
        { status: 403 }
      );
    }

    if (!order.quote) {
      return NextResponse.json(
        { error: '주문 정보를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const orderDetail: OrderDetail = {
      id: order.id,
      status: order.status,
      isDemo: isDemoShopifyOrderId(order.shopifyOrderId),
      trackingNumber: order.trackingNumber,
      shopifyOrderId: order.shopifyOrderId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      quote: {
        id: order.quote.id,
        productName: order.quote.productName,
        productSnapshot: order.quote.productSnapshot,
        cartSnapshot: order.quote.cartSnapshot,
        destinationCountry: order.quote.destinationCountry,
        destinationAddress: order.quote.destinationAddress,
        productPriceUsd: order.quote.productPriceUsd,
        serviceFee: order.quote.serviceFee,
        domesticShippingUsd: order.quote.domesticShippingUsd,
        internationalShipping: order.quote.internationalShipping,
        customsDuty: order.quote.customsDuty,
        vat: order.quote.vat,
        totalUsd: order.quote.totalUsd,
        exchangeRate: order.quote.exchangeRate,
      },
    };

    return NextResponse.json({ order: orderDetail });
  } catch (error) {
    logger.error('Order GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orders/[orderId]
 * Disabled: admin updates are centralized to /api/admin/orders/[id]
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  return NextResponse.json(
    {
      error: '주문 수정은 /api/admin/orders/[id] 경로만 허용됩니다.',
      code: 'ORDER_PATCH_ADMIN_API_ONLY',
      orderId,
    },
    { status: 405 }
  );
}
