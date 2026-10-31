'use client';

import { createContext, useContext, useMemo, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { requestJson } from './api';
import type { IntakeDraft } from '@/lib/purchases/intake-draft';

export interface PurchaseClient {
  request: typeof requestJson;
  navigate: (path: string) => void;
  href: (path: string) => string;
  preview: boolean;
  previewDraft?: { value: IntakeDraft; ready: boolean; update: Dispatch<SetStateAction<IntakeDraft>> };
}

const Context = createContext<PurchaseClient | null>(null);

export function PurchaseClientProvider({ client, children }: { client: PurchaseClient; children: ReactNode }) {
  return <Context.Provider value={client}>{children}</Context.Provider>;
}

// A UI transport, never an authentication provider. Real APIs still verify the
// server session. Only the explicitly gated local preview supplies an adapter.
export function usePurchaseClient(): PurchaseClient {
  const client = useContext(Context);
  const router = useRouter();
  return useMemo(() => client ?? {
    request: requestJson, navigate: router.push, href: (path: string) => path, preview: false,
  }, [client, router]);
}
