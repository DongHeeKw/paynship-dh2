/**
 * Admin Module - Public API
 *
 * @module lib/admin
 */

// Type definitions
export * from './types';

// Cache utilities
export {
  DEFAULT_ADMIN_SETTINGS,
  getAdminSettings,
  invalidateAdminSettingsCache,
  updateAdminSettings,
} from './cache';

// Audit utilities
export {
  buildAdminSettingsChanges,
  buildFieldChanges,
  recordAdminAuditLog,
  recordAdminSettingsAuditLog,
  extractRequestMeta,
  getRequestPathname,
} from './audit';
