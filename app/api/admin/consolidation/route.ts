/**
 * Admin Consolidation API
 *
 * POST /api/admin/consolidation  — create a consolidation group from order IDs
 * GET  /api/admin/consolidation  — list all consolidation groups
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminForApi, handleApiError } from '@/lib/api/auth-middleware';
import {
  createConsolidationGroup,
  listConsolidationGroups,
} from '@/lib/shipping/consolidation';

const createGroupSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(2, 'At least 2 order IDs required'),
});

export async function GET(
  _request: NextRequest
) {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const groups = await listConsolidationGroups();

    return NextResponse.json({ groups });
  } catch (error) {
    return handleApiError(error, 'Admin Consolidation GET');
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const admin = await requireAdminForApi({ minimumRole: 'operator' });
    if (admin.error) return admin.error;

    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const group = await createConsolidationGroup(parsed.data.orderIds);

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Admin Consolidation POST');
  }
}
