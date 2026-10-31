/**
 * Procurement Task Detail API
 *
 * PATCH /api/admin/procurement-tasks/:id
 * Mark a task as purchased and record receipt information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { updateProcurementTask } from '@/lib/procurement/service';
import logger from '@/lib/utils/logger';

const patchSchema = z.object({
  status: z.enum(['queued', 'researching', 'ready_to_buy', 'purchased', 'failed', 'cancelled']).optional(),
  actualPriceKrw: z.number().int().positive().optional(),
  purchaseReceipt: z.string().max(500).optional(),
  purchaseNote: z.string().max(1000).optional(),
  selectedSourceUrl: z.string().url().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const { id } = await params;

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { status, actualPriceKrw, purchaseReceipt, purchaseNote, selectedSourceUrl } =
      parsed.data;

    // Build metadata update — merge purchase info into task metadata
    const metadataUpdate: Record<string, unknown> = {};
    if (actualPriceKrw !== undefined) metadataUpdate.actualPriceKrw = actualPriceKrw;
    if (purchaseReceipt !== undefined) metadataUpdate.purchaseReceipt = purchaseReceipt;
    if (purchaseNote !== undefined) metadataUpdate.purchaseNote = purchaseNote;
    if (status === 'purchased') metadataUpdate.purchasedAt = new Date().toISOString();

    const updated = await updateProcurementTask(id, {
      status,
      selectedSourceUrl,
      metadata: Object.keys(metadataUpdate).length > 0 ? metadataUpdate : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Procurement task not found' }, { status: 404 });
    }

    logger.info('[Procurement]', `Task ${id} updated to status ${updated.status}`);

    return NextResponse.json({ task: updated });
  } catch (error) {
    logger.error('[Procurement PATCH] Error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}
