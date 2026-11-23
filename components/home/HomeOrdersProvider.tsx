'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseClient } from '@/components/purchases/PurchaseClient';
import type { HomeOrders } from '@/lib/purchases/home-types';

interface HomeOrdersState { data: HomeOrders | null; loading: boolean; error: boolean; retry: () => void }
const Context = createContext<HomeOrdersState>({ data: null, loading: false, error: false, retry: () => {} });
export const useHomeOrders = () => useContext(Context);
export function HomeOrdersProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { request, preview } = usePurchaseClient();
  const ownerId = !authLoading && !preview ? user?.id : undefined;
  const [retryVersion, setRetryVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<{ ownerId: string; data: HomeOrders | null; error: boolean } | null>(null);
  useEffect(() => {
    if (!ownerId) { setSnapshot(null); return; }
    const controller = new AbortController(); let current = true;
    setSnapshot(null);
    void request<HomeOrders>('/api/purchases?view=home', { signal: controller.signal }).then((data) => {
      if (current) setSnapshot({ ownerId, data, error: false });
    }).catch(() => { if (current) setSnapshot({ ownerId, data: null, error: true }); });
    return () => { current = false; controller.abort(); };
  }, [ownerId, request, retryVersion]);
  // Render-time owner check prevents a stale account flash even before effect cleanup.
  const owned = ownerId && snapshot?.ownerId === ownerId ? snapshot : null;
  return <Context.Provider value={{ data: owned?.data ?? null, loading: Boolean(ownerId && !owned),
    error: owned?.error ?? false, retry: () => setRetryVersion((value) => value + 1) }}>{children}</Context.Provider>;
}
