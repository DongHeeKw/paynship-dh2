import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/api/auth-middleware', () => ({
  requireAdminForApi: vi.fn(),
}));

vi.mock('@/lib/procurement/service', () => ({
  createProcurementBatch: vi.fn(),
  listProcurementBatches: vi.fn(),
}));

import { GET, POST } from './route';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { createProcurementBatch, listProcurementBatches } from '@/lib/procurement/service';

describe('GET /api/admin/procurement-batches', () => {
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

    const request = new NextRequest('http://localhost/api/admin/procurement-batches');
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it('lists procurement batches', async () => {
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: { id: 'admin-1' },
      isAdmin: true,
    } as any);
    vi.mocked(listProcurementBatches).mockResolvedValue([
      { id: 'batch-1', status: 'sourcing' },
    ] as any);

    const request = new NextRequest('http://localhost/api/admin/procurement-batches');
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.batches).toHaveLength(1);
  });
});

describe('POST /api/admin/procurement-batches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates procurement batch for operators', async () => {
    vi.mocked(requireAdminForApi).mockResolvedValue({
      user: { id: 'operator-1' },
      isAdmin: true,
    } as any);
    vi.mocked(createProcurementBatch).mockResolvedValue({
      id: 'batch-1',
      status: 'draft',
    } as any);

    const request = new NextRequest('http://localhost/api/admin/procurement-batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderIntentIds: ['intent-1'],
        sourceVendor: 'coupang',
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.batch.id).toBe('batch-1');
  });
});
