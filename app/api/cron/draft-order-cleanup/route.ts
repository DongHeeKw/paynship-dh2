import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { executeMutation } from '@/lib/shopify/client';
import { buildShopifyGid } from '@/lib/shopify/client';

export const runtime = 'nodejs';

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  if (!secret) {
    return false; // Default deny when CRON_SECRET is not set
  }

  return authorization === `Bearer ${secret}`;
}

const DRAFT_ORDER_DELETE_MUTATION = `
  mutation draftOrderDelete($input: DraftOrderDeleteInput!) {
    draftOrderDelete(input: $input) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

interface DraftOrderDeleteResponse {
  draftOrderDelete: {
    deletedId: string | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();

  // Find expired quotes with a draft order but no corresponding Order
  const expiredQuotes = await prisma.quote.findMany({
    where: {
      shopifyDraftId: { not: null },
      validUntil: { lt: new Date() },
      orders: { none: {} },
    },
    select: {
      id: true,
      shopifyDraftId: true,
    },
  });

  let cleaned = 0;
  const errors: string[] = [];

  for (const quote of expiredQuotes) {
    if (!quote.shopifyDraftId) continue;

    try {
      const gid = buildShopifyGid('DraftOrder', quote.shopifyDraftId);
      await executeMutation<DraftOrderDeleteResponse>(DRAFT_ORDER_DELETE_MUTATION, {
        input: { id: gid },
      });
    } catch (err) {
      // Log the error but still clear local references to avoid stale data
      const msg = `Failed to delete Shopify draft ${quote.shopifyDraftId} for quote ${quote.id}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[DraftOrderCleanup] ${msg}`);
      errors.push(msg);
    }

    // Always clear local references regardless of Shopify API result
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        shopifyDraftId: null,
        invoiceUrl: null,
      },
    });

    cleaned++;
  }

  console.log(`[DraftOrderCleanup] Cleaned ${cleaned} expired draft orders in ${Date.now() - startedAt}ms`);

  return NextResponse.json({
    success: true,
    cleaned,
    errors: errors.length > 0 ? errors : undefined,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
