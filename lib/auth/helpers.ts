import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';
import type { User } from '@supabase/supabase-js';
import logger from '@/lib/utils/logger';
import { resolveAdminRole, hasAdminRoleAccess, type AdminRole } from './admin-role';
export { hasAdminRoleAccess } from './admin-role';
export type { AdminRole } from './admin-role';

export interface AuthResult { user: User | null; error: string | null; isGuest: boolean; }
export interface AdminResult { user: User | null; error: string | null; isAdmin: boolean; adminRole: AdminRole | null; }

export async function getAuthUser(): Promise<AuthResult> {
  try {
    const client = await createClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user || !user.email || !user.email_confirmed_at) return { user: null, error: null, isGuest: true };
    return { user, error: null, isGuest: false };
  } catch {
    logger.error('Auth: Unable to verify user');
    return { user: null, error: 'Unable to verify authentication', isGuest: true };
  }
}

export async function requireAuth(): Promise<AuthResult> {
  const result = await getAuthUser();
  return result.user ? result : { user: null, error: 'Unauthorized', isGuest: true };
}

export async function requireAdmin(requiredRole: AdminRole = 'viewer'): Promise<AdminResult> {
  const { user, error } = await requireAuth();
  if (error || !user) return { user: null, error: 'Unauthorized', isAdmin: false, adminRole: null };
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { isAdmin: true } });
    const adminRole = resolveAdminRole(dbUser?.isAdmin === true, user.id, user.email!);
    if (!adminRole) return { user, error: 'Admin access required', isAdmin: false, adminRole: null };
    if (!hasAdminRoleAccess(adminRole, requiredRole)) return { user, error: `Admin role ${requiredRole} required`, isAdmin: false, adminRole };
    return { user, error: null, isAdmin: true, adminRole };
  } catch {
    logger.error('Auth: Unable to verify administrator');
    return { user, error: 'Unable to verify administrator', isAdmin: false, adminRole: null };
  }
}

export async function ensureUserExists(user: User): Promise<{ success: boolean; userId: string }> {
  if (!user.email || !user.email_confirmed_at) return { success: false, userId: '' };
  try {
    const row = await prisma.user.upsert({ where: { id: user.id }, create: { id: user.id, email: user.email }, update: {} });
    return { success: true, userId: row.id };
  } catch {
    logger.error('Auth: Unable to initialize user');
    return { success: false, userId: '' };
  }
}
