import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })) }));
vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { findUnique: mocks.findUnique, upsert: mocks.upsert } } }));
vi.mock('@/lib/utils/logger', () => ({ default: { error: vi.fn() } }));
import { ensureUserExists, getAuthUser, hasAdminRoleAccess, requireAdmin } from '../helpers';

const verifiedUser = { id: 'a9b3dc40-381a-4149-8c12-a1ef9374e276', email: 'operator@example.com', email_confirmed_at: '2026-10-10T00:00:00Z', user_metadata: { isAdmin: true } } as unknown as User;
describe('verified operator authorization', () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('ADMIN_SUPER_ADMINS', ''); vi.stubEnv('ADMIN_OPERATORS', ''); vi.stubEnv('ADMIN_VIEWERS', '');
    mocks.getUser.mockResolvedValue({ data: { user: verifiedUser }, error: null });
    mocks.findUnique.mockResolvedValue({ isAdmin: true });
  });
  it('rejects an unverified email before reading any administrator data', async () => {
    vi.stubEnv('ADMIN_SUPER_ADMINS', verifiedUser.email!);
    mocks.getUser.mockResolvedValue({ data: { user: { ...verifiedUser, email_confirmed_at: undefined } }, error: null });
    expect((await requireAdmin()).isAdmin).toBe(false); expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it('rejects an administrator without an explicit server role mapping', async () => {
    expect(await requireAdmin()).toMatchObject({ isAdmin: false, adminRole: null });
  });
  it('requires the database administrator flag even when metadata and env claim access', async () => {
    vi.stubEnv('ADMIN_SUPER_ADMINS', verifiedUser.email!); mocks.findUnique.mockResolvedValue({ isAdmin: false });
    expect((await requireAdmin()).isAdmin).toBe(false);
  });
  it('enforces the operator role boundary for a mapped viewer', async () => {
    vi.stubEnv('ADMIN_VIEWERS', ' OPERATOR@EXAMPLE.COM ');
    expect(await requireAdmin('viewer')).toMatchObject({ isAdmin: true, adminRole: 'viewer' });
    expect(await requireAdmin('operator')).toMatchObject({ isAdmin: false, adminRole: 'viewer' });
  });
  it('accepts a mapped operator id, but denies super administrator actions', async () => {
    vi.stubEnv('ADMIN_OPERATORS', verifiedUser.id);
    expect(await requireAdmin('operator')).toMatchObject({ isAdmin: true, adminRole: 'operator' });
    expect((await requireAdmin('super_admin')).isAdmin).toBe(false);
  });
  it('fails closed when session verification returns an error or the database is unavailable', async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: verifiedUser }, error: new Error('invalid token') });
    expect((await getAuthUser()).user).toBeNull();
    vi.stubEnv('ADMIN_OPERATORS', verifiedUser.id); mocks.findUnique.mockRejectedValueOnce(new Error('database unavailable'));
    expect((await requireAdmin('operator')).isAdmin).toBe(false);
  });
  it('does not provision unverified users or allow metadata to grant database roles', async () => {
    expect((await ensureUserExists({ ...verifiedUser, email_confirmed_at: undefined })).success).toBe(false);
    expect(mocks.upsert).not.toHaveBeenCalled();
    mocks.upsert.mockResolvedValue({ id: verifiedUser.id });
    expect((await ensureUserExists(verifiedUser)).success).toBe(true);
    expect(mocks.upsert).toHaveBeenCalledWith({ where: { id: verifiedUser.id }, create: { id: verifiedUser.id, email: verifiedUser.email }, update: {} });
  });
  it('keeps role ordering explicit', () => {
    expect(hasAdminRoleAccess('super_admin', 'operator')).toBe(true); expect(hasAdminRoleAccess('operator', 'viewer')).toBe(true);
    expect(hasAdminRoleAccess('viewer', 'operator')).toBe(false); expect(hasAdminRoleAccess('operator', 'super_admin')).toBe(false);
  });
});
