/**
 * Admin Refund API
 *
 * POST  /api/admin/orders/:id/refund  — initiate refund
 * GET   /api/admin/orders/:id/refund  — get refund status
 * PATCH /api/admin/orders/:id/refund  — process (complete) a pending refund
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi, handleApiError } from '@/lib/api/auth-middleware';
import {
  initiateRefund,
  getRefundStatus,
  processRefund,
  type RefundReason,
} from '@/lib/refunds/service';

const initiateRefundSchema = z.object({
  reason: z.enum([
    'customer_request',
    'item_not_available',
    'item_damaged',
    'shipping_issue',
    'other',
  ]),
  amount: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const { id } = await params;
    const refund = await getRefundStatus(id);

    if (!refund) {
      return NextResponse.json({ error: 'No refund record found for this order' }, { status: 404 });
    }

    return NextResponse.json({ refund });
  } catch (error) {
    return handleApiError(error, 'Admin Refund GET');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id } = await params;

    const body = await request.json();
    const parsed = initiateRefundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { reason, amount, notes } = parsed.data;

    const refund = await initiateRefund(id, reason as RefundReason, { amount, notes });

    return NextResponse.json({ refund }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Admin Refund POST');
  }
}

const processRefundSchema = z.object({
  refundId: z.string().uuid(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id: orderId } = await params;

    const body = await request.json();
    const parsed = processRefundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const refund = await processRefund(parsed.data.refundId, orderId);

    return NextResponse.json({ refund });
  } catch (error) {
    return handleApiError(error, 'Admin Refund PATCH');
  }
}
