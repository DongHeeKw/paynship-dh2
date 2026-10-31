/**
 * Admin Warehouse Receipt API
 *
 * POST /api/admin/orders/:id/warehouse
 * Admin enters warehouse receipt + measurement data for an order.
 * Calculates Phase 2 shipping costs based on actual weight/dimensions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi, handleApiError } from '@/lib/api/auth-middleware';
import { validateOrderTransition } from '@/lib/orders/state-machine';
import { calculateShippingWithDetailsAsync } from '@/lib/calculator/shipping';
import { calculateCustomsDutyAsync, calculateSalesTaxAsync } from '@/lib/calculator/customs';
import { notifyCustomer } from '@/lib/notifications/service';
import logger from '@/lib/utils/logger';

const warehouseSchema = z.object({
  actualWeightKg: z.number().positive(),
  dimensions: z.object({
    l: z.number().positive(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
  warehouseNotes: z.string().optional(),
  warehousePhotos: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id } = await params;

    const body = await request.json();
    const parsed = warehouseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { actualWeightKg, dimensions, warehouseNotes, warehousePhotos } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        destinationCountry: true,
        phase1TotalUsd: true,
        productAmountUsd: true,
        estimatedShippingUsd: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Accept PURCHASED and legacy PAID/PROCESSING statuses
    const acceptedStatuses = ['PURCHASED', 'PAID', 'PROCESSING'];
    if (!acceptedStatuses.includes(order.status)) {
      const transition = validateOrderTransition({
        currentStatus: order.status,
        nextStatus: 'WAREHOUSE_RECEIVED',
        trackingNumber: null,
      });
      if (!transition.ok) {
        return NextResponse.json(
          {
            error: transition.message ?? 'Invalid order status for warehouse receipt',
            code: transition.code ?? 'ORDER_TRANSITION_INVALID',
            currentStatus: order.status,
            allowedNextStatuses: transition.allowedNextStatuses ?? [],
          },
          { status: 409 }
        );
      }
    }

    if (!order.destinationCountry) {
      return NextResponse.json(
        { error: 'Order has no destination country set', code: 'MISSING_DESTINATION_COUNTRY' },
        { status: 422 }
      );
    }

    // Calculate weights
    // DIM factor 6000 (K-Packet/EMS standard)
    const DIM_FACTOR = 6000;
    const volumetricWeightKg =
      Math.round(((dimensions.l * dimensions.w * dimensions.h) / DIM_FACTOR) * 100) / 100;
    const chargeableWeightKg = Math.max(actualWeightKg, volumetricWeightKg);

    // Calculate Phase 2 costs
    const countryCode = order.destinationCountry;
    const packageDimensions = { length: dimensions.l, width: dimensions.w, height: dimensions.h };

    const shippingResult = await calculateShippingWithDetailsAsync(
      chargeableWeightKg,
      countryCode,
      packageDimensions
    );
    const intlShippingUsd = shippingResult.cost;

    // Use product amount only (not total incl. fees) for customs calculation; default HS code '00' (general)
    const itemValueUsd = order.productAmountUsd ?? order.phase1TotalUsd ?? 0;
    const customsDutyUsd = await calculateCustomsDutyAsync(itemValueUsd, '00', countryCode);
    const taxableAmount = itemValueUsd + intlShippingUsd + customsDutyUsd;
    const taxUsd = await calculateSalesTaxAsync(taxableAmount, countryCode);

    const phase2TotalUsd =
      Math.round((intlShippingUsd + customsDutyUsd + taxUsd) * 100) / 100;

    // Compare Phase 2 actual vs Phase 1 estimate — flag >30% discrepancy
    const estimatedShippingUsd = order.estimatedShippingUsd ?? null;
    const discrepancy: {
      estimatedShippingUsd: number | null;
      actualShippingUsd: number;
      diffPercent: number | null;
      flagged: boolean;
    } = {
      estimatedShippingUsd,
      actualShippingUsd: intlShippingUsd,
      diffPercent: null,
      flagged: false,
    };

    if (estimatedShippingUsd !== null && estimatedShippingUsd > 0) {
      const diffPercent =
        Math.round(
          (Math.abs(intlShippingUsd - estimatedShippingUsd) / estimatedShippingUsd) * 1000
        ) / 10;
      discrepancy.diffPercent = diffPercent;
      discrepancy.flagged = diffPercent > 30;
      if (discrepancy.flagged) {
        logger.warn('[Warehouse] Cost discrepancy flagged', {
          orderId: id,
          estimatedShippingUsd,
          actualShippingUsd: intlShippingUsd,
          diffPercent,
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        warehouseReceivedAt: new Date(),
        actualWeightKg,
        actualDimensions: { l: dimensions.l, w: dimensions.w, h: dimensions.h },
        volumetricWeightKg,
        chargeableWeightKg,
        warehouseNotes: warehouseNotes ?? null,
        warehousePhotos: warehousePhotos ? JSON.parse(JSON.stringify(warehousePhotos)) : null,
        intlShippingUsd,
        customsDutyUsd,
        taxUsd,
        phase2TotalUsd,
        status: 'WAREHOUSE_RECEIVED',
      },
    });

    notifyCustomer({
      userId: order.userId,
      type: 'WAREHOUSE_RECEIVED',
      data: { chargeableWeightKg, orderId: order.id },
    }).catch(() => {}); // fire-and-forget

    return NextResponse.json({ order: updatedOrder, discrepancy });
  } catch (error) {
    return handleApiError(error, 'Admin Warehouse POST');
  }
}
