import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { createProcurementBatch, listProcurementBatches } from '@/lib/procurement/service';

const createProcurementBatchSchema = z.object({
  sourceVendor: z.string().optional(),
  orderIntentIds: z.array(z.string()).optional(),
  operatorUserId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(_request: NextRequest) {
  const admin = await requireAdminForApi();
  if (admin.error) return admin.error;

  try {
    const batches = await listProcurementBatches();
    return NextResponse.json({ batches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list procurement batches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminForApi({ minimumRole: 'operator' });
  if (admin.error) return admin.error;

  try {
    const body = await request.json();
    const data = createProcurementBatchSchema.parse(body);

    const batch = await createProcurementBatch({
      sourceVendor: data.sourceVendor ?? null,
      orderIntentIds: data.orderIntentIds ?? [],
      operatorUserId: data.operatorUserId ?? admin.user?.id ?? null,
      metadata: data.metadata ?? null,
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create procurement batch' },
      { status: 500 }
    );
  }
}
