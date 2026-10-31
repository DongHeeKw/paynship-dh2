import { NextRequest, NextResponse } from 'next/server';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { listProcurementTasks } from '@/lib/procurement/service';

export async function GET(_request: NextRequest) {
  const admin = await requireAdminForApi();
  if (admin.error) return admin.error;

  try {
    const tasks = await listProcurementTasks();
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list procurement tasks' },
      { status: 500 }
    );
  }
}
