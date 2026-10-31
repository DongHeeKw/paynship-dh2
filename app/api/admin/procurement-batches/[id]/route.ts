import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { updateProcurementBatch } from '@/lib/procurement/service';

const patchProcurementBatchSchema = z.object({
  status: z.enum(['draft', 'queued', 'sourcing', 'approved', 'purchased', 'partially_purchased', 'cancelled']).optional(),
  sourceVendor: z.string().nullable().optional(),
  orderIntentIds: z.array(z.string()).optional(),
  operatorUserId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdminForApi({ minimumRole: 'operator' });
  if (admin.error) return admin.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = patchProcurementBatchSchema.parse(body);

    const batch = await updateProcurementBatch(id, {
      status: data.status,
      sourceVendor: data.sourceVendor ?? undefined,
      orderIntentIds: data.orderIntentIds,
      operatorUserId: data.operatorUserId ?? undefined,
      metadata: data.metadata ?? undefined,
    });

    if (!batch) {
      return NextResponse.json({ error: 'Procurement batch not found' }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update procurement batch' },
      { status: 500 }
    );
  }
}
