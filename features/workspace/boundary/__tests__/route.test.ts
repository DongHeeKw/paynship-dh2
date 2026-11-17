import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ getWorkspace: vi.fn(), applyWorkspaceAction: vi.fn() }));
vi.mock('@/features/workspace/core/service', async importOriginal => {
  const actual = await importOriginal<typeof import('@/features/workspace/core/service')>();
  return { ...actual, ...service };
});

import { GET, POST } from '@/app/dev/workspace/data/route';
import { WorkspaceError } from '@/features/workspace/core/service';

const origin = 'http://127.0.0.1:3001';
const action = { customerId: 'sample-customer-jp', idempotencyKey: 'e0000000-0000-4000-8000-000000000001', action: 'top_up', amountCents: 1000 };
const state = { sampleOnly: true, customer: { id: 'sample-customer-jp' } };
const post = (input: unknown, extraHeaders: Record<string, string> = {}) => new Request(origin + '/dev/workspace/data', {
  method: 'POST', headers: { host: '127.0.0.1:3001', origin, 'content-type': 'application/json', ...extraHeaders }, body: JSON.stringify(input),
});

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('PAYNSHIP_DEV_PREVIEW', '1');
  service.getWorkspace.mockReset();
  service.applyWorkspaceAction.mockReset();
  service.getWorkspace.mockReturnValue(state);
  service.applyWorkspaceAction.mockReturnValue(state);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('workspace endpoint boundary', () => {
  it('returns only the selected sample workspace with no-store', async () => {
    const response = await GET(new Request(origin + '/dev/workspace/data?customerId=sample-customer-jp', { headers: { host: '127.0.0.1:3001' } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(state);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(service.getWorkspace).toHaveBeenCalledExactlyOnceWith('sample-customer-jp');
  });

  it.each(['customerId=actual-account', 'customerId=sample-customer-jp&customerId=sample-customer-us', 'customerId=sample-customer-jp&includeAll=true'])('rejects non-sample or ambiguous query %s', async query => {
    expect((await GET(new Request(origin + '/dev/workspace/data?' + query, { headers: { host: '127.0.0.1:3001' } }))).status).toBe(400);
    expect(service.getWorkspace).not.toHaveBeenCalled();
  });

  it('independently returns 404 in production without accessing the sample DB', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const request = post(action, { 'x-paynship-dev-preview': '1', 'x-forwarded-host': 'localhost:3001' });
    expect((await POST(request)).status).toBe(404);
    expect((await GET(request)).status).toBe(404);
    expect(service.getWorkspace).not.toHaveBeenCalled();
    expect(service.applyWorkspaceAction).not.toHaveBeenCalled();
  });

  it('independently rejects a public Host and disabled preview without touching sample data', async () => {
    expect((await POST(post(action, { host: 'public.example', 'x-forwarded-host': 'localhost:3001' }))).status).toBe(404);
    vi.stubEnv('PAYNSHIP_DEV_PREVIEW', '0');
    expect((await POST(post(action))).status).toBe(404);
    expect(service.applyWorkspaceAction).not.toHaveBeenCalled();
  });

  it('rejects both missing and cross-origin mutations before parsing or applying them', async () => {
    const missing = post(action); missing.headers.delete('origin');
    expect((await POST(missing)).status).toBe(403);
    expect((await POST(post(action, { origin: 'https://attacker.example' }))).status).toBe(403);
    expect((await POST(post(action, { origin: 'http://127.0.0.1:3002' }))).status).toBe(403);
    expect(service.applyWorkspaceAction).not.toHaveBeenCalled();
  });

  it('accepts a strict sample action and returns its updated sample workspace', async () => {
    const response = await POST(post(action));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(state);
    expect(service.applyWorkspaceAction).toHaveBeenCalledExactlyOnceWith(action);
  });

  it.each([
    { ...action, isAdmin: true },
    { ...action, customerId: 'actual-account' },
    { ...action, amountCents: 0 },
    { ...action, action: 'confirm_real_payment' },
    [{ ...action }],
  ])('rejects unexpected fields and unsupported action data', async input => {
    expect((await POST(post(input))).status).toBe(400);
    expect(service.applyWorkspaceAction).not.toHaveBeenCalled();
  });

  it('bounds declared and actual body sizes before sample mutation', async () => {
    expect((await POST(post(action, { 'content-length': '9999' }))).status).toBe(413);
    expect((await POST(post({ ...action, message: 'x'.repeat(8300) }))).status).toBe(413);
    expect(service.applyWorkspaceAction).not.toHaveBeenCalled();
  });

  it('preserves a service ownership denial and hides unexpected database errors', async () => {
    service.applyWorkspaceAction.mockImplementationOnce(() => { throw new WorkspaceError(403, 'That sample request belongs to another sample customer.'); });
    expect((await POST(post(action))).status).toBe(403);
    service.applyWorkspaceAction.mockImplementationOnce(() => { throw new Error('private database path and internal diagnostics'); });
    const response = await POST(post(action));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private database');
  });
});
