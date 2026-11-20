// The broad inventory is deliberately larger than the enforced core. Legacy
// source stays visible; no unexecuted file disappears from the denominator.
export const roots=['app','components','contexts','features','lib','middleware.ts'];
export const protectedFiles=[
  'lib/auth/admin-mfa.ts', 'lib/auth/admin-role.ts', 'lib/auth/helpers.ts',
  'lib/security/csrf.ts', 'lib/purchases/availability.ts',
  'lib/purchases/customs-gate.ts', 'lib/purchases/destination-policy.ts',
  'lib/purchases/service-fee.ts', 'lib/purchases/money.ts',
  'lib/purchases/payment-provider.ts', 'lib/purchases/payment-verification.ts',
  'lib/dev-preview/access.ts', 'features/reseller/core/auth.ts',
];
export function isSource(path) {
  return roots.some(root=>path===root||path.startsWith(root+'/'))&&/\.(?:ts|tsx|js|mjs)$/.test(path)&&
    !/(?:^|\/)(?:__tests__|node_modules|\.tools)(?:\/|$)|\.(?:test|spec|d)\.[cm]?[jt]sx?$/.test(path);
}
