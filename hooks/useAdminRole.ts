'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdminRole } from '@/lib/admin/types';

interface UseAdminRoleResult {
  role: AdminRole | null;
  isLoading: boolean;
  error: string | null;
  canViewAdmin: boolean;
  canOperate: boolean;
  canManageSettings: boolean;
  refresh: () => Promise<void>;
}

interface AdminSettingsRolePayload {
  adminRole?: AdminRole;
}

export function useAdminRole(): UseAdminRoleResult {
  const [role, setRole] = useState<AdminRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin-settings');
      if (!response.ok) {
        throw new Error(`Failed to fetch admin role: ${response.status}`);
      }

      const data = await response.json() as AdminSettingsRolePayload;
      setRole(data.adminRole ?? null);
    } catch (err) {
      setRole(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(() => {
    const canViewAdmin = role !== null;
    const canOperate = role === 'operator' || role === 'super_admin';
    const canManageSettings = role === 'super_admin';

    return {
      role,
      isLoading,
      error,
      canViewAdmin,
      canOperate,
      canManageSettings,
      refresh,
    };
  }, [role, isLoading, error, refresh]);
}

