import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getAuthUser } from '@/lib/auth/helpers';
import { isDemoShopifyOrderId } from '@/lib/orders/demo';

const querySchema = z.object({
  quoteId: z.string().uuid(),
});

type PaymentTrackingState = 'PAYMENT_PENDING' | 'ORDER_CONFIRMED' | 'WEBHOOK_FAILED';

export async function GET(request: NextRequest) {
  const auth = await getAuthUser();
  if (!auth.user || auth.isGuest) {
    return NextResponse.json(
      { error: '로그인이 필요합니다' },
      { status: 401 }
    );
  }

  const parsed = querySchema.safeParse({
    quoteId: request.nextUrl.searchParams.get('quoteId'),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: '유효하지 않은 quoteId 입니다' },
      { status: 400 }
    );
  }

  const quote = await prisma.quote.findUnique({
    where: { id: parsed.data.quoteId },
    select: {
      id: true,
      userId: true,
      createdAt: true,
    },
  });

  if (!quote) {
    return NextResponse.json(
      { error: '견적을 찾을 수 없습니다' },
      { status: 404 }
    );
  }

  if (!quote.userId || quote.userId !== auth.user.id) {
    return NextResponse.json(
      { error: '해당 견적에 대한 권한이 없습니다' },
      { status: 403 }
    );
  }

  const [order, latestPaidWebhook] = await Promise.all([
    prisma.order.findFirst({
      where: { quoteId: quote.id },
      select: {
        id: true,
        status: true,
        shopifyOrderId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.shopifyWebhookEvent.findFirst({
      where: {
        quoteId: quote.id,
        topic: 'orders/paid',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        processingStatus: true,
        correlationStatus: true,
        httpStatus: true,
        errorMessage: true,
        createdAt: true,
        processedAt: true,
      },
    }),
  ]);

  let state: PaymentTrackingState = 'PAYMENT_PENDING';
  if (order) {
    state = 'ORDER_CONFIRMED';
  } else if (latestPaidWebhook?.processingStatus === 'FAILED') {
    state = 'WEBHOOK_FAILED';
  }

  return NextResponse.json({
    quoteId: quote.id,
    state,
    pollAfterMs: 5000,
    slaHint: '일반적으로 결제 반영은 30~120초 내 완료됩니다.',
    checkedAt: new Date().toISOString(),
    waitingSince: quote.createdAt.toISOString(),
    order: order ? {
      id: order.id,
      status: order.status,
      isDemo: isDemoShopifyOrderId(order.shopifyOrderId),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    } : null,
    latestPaidWebhook: latestPaidWebhook ? {
      id: latestPaidWebhook.id,
      processingStatus: latestPaidWebhook.processingStatus,
      correlationStatus: latestPaidWebhook.correlationStatus,
      httpStatus: latestPaidWebhook.httpStatus,
      errorMessage: latestPaidWebhook.errorMessage,
      createdAt: latestPaidWebhook.createdAt.toISOString(),
      processedAt: latestPaidWebhook.processedAt?.toISOString() ?? null,
    } : null,
  });
}

