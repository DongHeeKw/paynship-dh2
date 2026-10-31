import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi, handleApiError } from '@/lib/api/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const topic = searchParams.get('topic');
    const processingStatus = searchParams.get('processingStatus');
    const correlationStatus = searchParams.get('correlationStatus');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Prisma.ShopifyWebhookEventWhereInput = {};

    if (topic) where.topic = topic;
    if (processingStatus) where.processingStatus = processingStatus;
    if (correlationStatus) where.correlationStatus = correlationStatus;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [total, logs] = await Promise.all([
      prisma.shopifyWebhookEvent.count({ where }),
      prisma.shopifyWebhookEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          webhookId: true,
          topic: true,
          shopDomain: true,
          shopifyOrderId: true,
          quoteId: true,
          correlationStatus: true,
          processingStatus: true,
          httpStatus: true,
          processingMs: true,
          errorMessage: true,
          payload: true,
          createdAt: true,
          processedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
        processedAt: log.processedAt?.toISOString() ?? null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, 'Admin Shopify Webhooks GET', 'Failed to fetch webhook logs');
  }
}
