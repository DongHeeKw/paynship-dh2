import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireAdmin, type AdminRole } from '@/lib/auth/helpers';
import logger from '@/lib/utils/logger';
import type { ApiErrorResponse } from './error-handler';
export type { ApiErrorResponse } from './error-handler';

export interface ApiAdminResult { user: User | null; isAdmin: boolean; adminRole?: AdminRole | null; error?: NextResponse<ApiErrorResponse>; }
export interface RequireAdminForApiOptions { minimumRole?: AdminRole; }

export async function requireAdminForApi(options?: RequireAdminForApiOptions): Promise<ApiAdminResult> {
  const minimumRole = options?.minimumRole ?? 'viewer';
  const { user, error, isAdmin, adminRole } = await requireAdmin(minimumRole);
  if (error || !isAdmin) return { user, isAdmin: false, adminRole, error: NextResponse.json({ error: 'Admin access required', code: 'ADMIN_REQUIRED' }, { status: 403 }) };
  return { user, isAdmin: true, adminRole };
}

export function handleApiError(error: unknown, context?: string, fallbackMessage?: string): NextResponse<ApiErrorResponse> {
  logger.error(context ? `API: ${context} failed` : 'API: Request failed');
  if (error instanceof z.ZodError) return NextResponse.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 400 });
  return NextResponse.json({ error: fallbackMessage || 'Internal server error', code: 'INTERNAL_ERROR' }, { status: 500 });
}
