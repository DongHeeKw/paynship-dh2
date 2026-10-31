import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import logger from '@/lib/utils/logger';

export interface AdminSettingFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export type AdminAuditAction =
  | 'UPDATE_ADMIN_SETTINGS'
  | 'UPDATE_ORDER'
  | 'ORDER_SHOPIFY_SYNC_FAILED'
  | 'DELETE_OPERATIONAL_LOGS'
  | 'RUN_MANUAL_CLEANUP'
  | 'RUN_SCRAPER_HEALTH_ACTION'
  | 'RUN_SHOPIFY_SYNC';

export interface AdminAuditRequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  path?: string;
}

interface RecordAdminSettingsAuditParams {
  adminUserId: string | null;
  adminUserEmail: string | null;
  targetId: string;
  changes: AdminSettingFieldChange[];
  requestMeta?: AdminAuditRequestMeta;
}

export interface RecordAdminAuditLogParams {
  adminUserId: string | null;
  adminUserEmail: string | null;
  action: AdminAuditAction;
  target: string;
  targetId?: string | null;
  changes: AdminSettingFieldChange[];
  requestMeta?: AdminAuditRequestMeta;
}

const NON_AUDITABLE_KEYS = new Set([
  'clearLLMFallback',
  'llmFallback',
]);

export function buildAdminSettingsChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  requestedKeys: string[]
): AdminSettingFieldChange[] {
  const changes: AdminSettingFieldChange[] = [];

  for (const key of requestedKeys) {
    if (NON_AUDITABLE_KEYS.has(key)) continue;

    const beforeValue = before[key];
    const afterValue = after[key];

    if (!areValuesEqual(beforeValue, afterValue)) {
      changes.push({
        field: key,
        before: sanitizeForJson(beforeValue),
        after: sanitizeForJson(afterValue),
      });
    }
  }

  return changes;
}

export async function recordAdminSettingsAuditLog({
  adminUserId,
  adminUserEmail,
  targetId,
  changes,
  requestMeta,
}: RecordAdminSettingsAuditParams): Promise<void> {
  await recordAdminAuditLog({
    adminUserId,
    adminUserEmail,
    action: 'UPDATE_ADMIN_SETTINGS',
    target: 'admin_settings',
    targetId,
    changes,
    requestMeta,
  });
}

export async function recordAdminAuditLog({
  adminUserId,
  adminUserEmail,
  action,
  target,
  targetId,
  changes,
  requestMeta,
}: RecordAdminAuditLogParams): Promise<void> {
  if (changes.length === 0) return;

  try {
    await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        adminUserEmail,
        action,
        target,
        targetId,
        changes: changes as unknown as Prisma.InputJsonValue,
        requestMeta: requestMeta
          ? (sanitizeForJson(requestMeta) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (error) {
    // 설정 저장 자체를 막지 않도록 감사 로그 실패는 삼킨다.
    logger.error('[Admin Audit] Failed to write admin audit log', error);
  }
}

export function buildFieldChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[]
): AdminSettingFieldChange[] {
  const changes: AdminSettingFieldChange[] = [];

  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = after[key];
    if (!areValuesEqual(beforeValue, afterValue)) {
      changes.push({
        field: key,
        before: sanitizeForJson(beforeValue),
        after: sanitizeForJson(afterValue),
      });
    }
  }

  return changes;
}

export function extractRequestMeta(headers: Headers, path?: string): AdminAuditRequestMeta {
  const forwardedFor = headers.get('x-forwarded-for');
  const ipAddress = forwardedFor?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || null;
  const userAgent = headers.get('user-agent');

  return {
    ipAddress,
    userAgent,
    path,
  };
}

export function getRequestPathname(
  requestLike: { url?: string; nextUrl?: { pathname?: string } }
): string | undefined {
  if (requestLike.nextUrl?.pathname) {
    return requestLike.nextUrl.pathname;
  }

  if (!requestLike.url) return undefined;

  try {
    return new URL(requestLike.url).pathname;
  } catch {
    return undefined;
  }
}

function areValuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(sanitizeForJson(a)) === JSON.stringify(sanitizeForJson(b));
}

function sanitizeForJson(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForJson(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const sanitized: Record<string, unknown> = {};
  for (const key of keys) {
    sanitized[key] = sanitizeForJson(record[key]);
  }
  return sanitized;
}
