export type AdminRole = 'viewer' | 'operator' | 'super_admin';
const ROLE_RANK: Record<AdminRole, number> = { viewer: 1, operator: 2, super_admin: 3 };
const ROLE_ENV = [['super_admin', 'ADMIN_SUPER_ADMINS'], ['operator', 'ADMIN_OPERATORS'], ['viewer', 'ADMIN_VIEWERS']] as const;

export function hasAdminRoleAccess(currentRole: AdminRole, requiredRole: AdminRole): boolean { return ROLE_RANK[currentRole] >= ROLE_RANK[requiredRole]; }

// Both the database flag and a server-owned mapping are required. User metadata
// and an unmapped legacy administrator flag never grant an operator role.
export function resolveAdminRole(isAdmin: boolean, userId: string, email: string): AdminRole | null {
  if (!isAdmin) return null;
  const identifiers = [userId.trim().toLowerCase(), email.trim().toLowerCase()];
  for (const [role, env] of ROLE_ENV) {
    const members = new Set((process.env[env] || '').split(',').map(member => member.trim().toLowerCase()).filter(Boolean));
    if (identifiers.some(identifier => identifier.length > 0 && members.has(identifier))) return role;
  }
  return null;
}
