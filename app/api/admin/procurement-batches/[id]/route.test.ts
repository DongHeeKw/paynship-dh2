import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/api/auth-middleware', () => ({
  requireAdminForApi: vi.fn(),
}));

vi.mock('@/lib/procurement/service', () => ({
  updateProcurementBatch: vi.fn(),
}));

import { PATCH } from './route';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { updateProcurementBatch } from '@/lib/procurement/service';

describe('PATCH /api/admin/procurement-batches/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires operator role', async () => {
    const errorResponse = NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: null,
      isAdmin: false,
      error: errorResponse,
    } as any);

    const request = new NextRequest('http://localhost/api/admin/procurement-batches/batch-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sourcing' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'batch-1' }) });
    expect(response.status).toBe(403);
  });

  it('updates procurement batch', async () => {
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: { id: 'operator-1' },
      isAdmin: true,
    } as any);
    vi.mocked(updateProcurementBatch).mockResolvedValue({
      id: 'batch-1',
      status: 'sourcing',
    } as any);

    const request = new NextRequest('http://localhost/api/admin/procurement-batches/batch-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sourcing' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'batch-1' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.batch.status).toBe('sourcing');
  });
});
