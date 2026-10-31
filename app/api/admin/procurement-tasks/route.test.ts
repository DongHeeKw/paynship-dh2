import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/api/auth-middleware', () => ({
  requireAdminForApi: vi.fn(),
}));

vi.mock('@/lib/procurement/service', () => ({
  listProcurementTasks: vi.fn(),
}));

import { GET } from './route';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { listProcurementTasks } from '@/lib/procurement/service';

describe('GET /api/admin/procurement-tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires admin access', async () => {
    const errorResponse = NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: null,
      isAdmin: false,
      error: errorResponse,
    } as any);

    const request = new NextRequest('http://localhost/api/admin/procurement-tasks');
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  it('lists procurement tasks for admins', async () => {
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: { id: 'admin-1' },
      isAdmin: true,
    } as any);
    vi.mocked(listProcurementTasks).mockResolvedValue([
      { id: 'task-1', status: 'queued', batchId: 'batch-1' },
    ] as any);

    const request = new NextRequest('http://localhost/api/admin/procurement-tasks');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.tasks).toHaveLength(1);
  });
});
