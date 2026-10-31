/**
 * Commercial Invoice API
 *
 * GET /api/admin/orders/:id/invoice
 * Returns an HTML commercial invoice for customs declarations.
 * Operators can print-to-PDF from the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import {
  generateCommercialInvoiceHtml,
  buildLineItemsFromCartSnapshot,
} from '@/lib/documents/commercial-invoice';
import logger from '@/lib/utils/logger';

const SELLER_NAME = process.env.INVOICE_SELLER_NAME ?? 'PayNShip';
const SELLER_ADDRESS = process.env.INVOICE_SELLER_ADDRESS ?? '서울특별시';
const SELLER_COUNTRY = 'Republic of Korea (KR)';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const { id } = await params;
    logger.info('[Invoice]', `Generating commercial invoice for order ${id}`, { adminEmail: admin.user?.email });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        quote: {
          select: {
            productName: true,
            cartSnapshot: true,
            destinationCountry: true,
            destinationAddress: true,
            productPriceUsd: true,
            internationalShipping: true,
            exchangeRate: true,
          },
        },
        user: {
          select: { email: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const quote = order.quote;
    const destinationAddress =
      typeof quote?.destinationAddress === 'object' && quote.destinationAddress !== null
        ? Object.values(quote.destinationAddress as Record<string, string>)
            .filter(Boolean)
            .join(', ')
        : String(quote?.destinationAddress ?? '');

    const cartSnapshot = quote?.cartSnapshot ?? null;

    const lineItems = buildLineItemsFromCartSnapshot(cartSnapshot, undefined, quote?.exchangeRate ?? undefined);

    // If cart snapshot is empty but we have a product name, synthesize one item
    if (
      lineItems.length === 1 &&
      lineItems[0].description === 'Korean Product' &&
      quote?.productName
    ) {
      lineItems[0].description = quote.productName;
      lineItems[0].unitValueUsd = quote.productPriceUsd ?? 0;
    }

    const totalValueUsd = lineItems.reduce(
      (sum, item) => sum + item.unitValueUsd * item.quantity,
      0
    );

    const invoiceDate = new Date(order.createdAt).toISOString().split('T')[0];
    const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;

    const html = generateCommercialInvoiceHtml({
      invoiceNumber,
      invoiceDate,
      sellerName: SELLER_NAME,
      sellerAddress: SELLER_ADDRESS,
      sellerCountry: SELLER_COUNTRY,
      buyerName: order.user?.email ?? 'Customer',
      buyerAddress: destinationAddress,
      buyerCountry: quote?.destinationCountry ?? '',
      buyerEmail: order.user?.email ?? undefined,
      items: lineItems,
      totalValueUsd: Math.round(totalValueUsd * 100) / 100,
      shippingCostUsd: quote?.internationalShipping ?? undefined,
      declarationType: 'Sold',
      currency: 'USD',
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    logger.error('[Invoice] Failed to generate invoice', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
