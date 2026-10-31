'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { buildOAuthRedirectTo } from '@/lib/auth/oauth-client';
interface AuthContextValue { user: User | null; loading: boolean; isGuest: boolean; signIn: (nextPath?: string) => Promise<void>; signOut: () => Promise<void>; requireLogin: (reason?: string) => Promise<boolean>; }
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
export function AuthProvider({ children, localPreview = false }: { children: React.ReactNode; localPreview?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (localPreview) { setUser(null); setLoading(false); return; }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) { setLoading(false); return; }
    const client = createClient(); let mounted = true;
    void client.auth.getUser().then(({ data }) => { if (mounted) setUser(data.user?.email && data.user.email_confirmed_at ? data.user : null); }).catch(() => {}).finally(() => { if (mounted) setLoading(false); });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { if (mounted) { const verified = session?.user?.email && session.user.email_confirmed_at; setUser(verified ? session!.user : null); setLoading(false); } });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [localPreview]);
  const signIn = useCallback(async (nextPath = '/') => {
    if (localPreview) throw new Error('Exit the local preview to sign in.');
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('Sign in is not configured yet.');
    const safePath = nextPath.startsWith('/') && !nextPath.startsWith('//') && !nextPath.includes('\\') ? nextPath : '/';
    const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: buildOAuthRedirectTo(safePath) } });
    if (error) throw new Error('Sign in could not start. Please try again.');
  }, [localPreview]);
  const signOut = useCallback(async () => { if (localPreview) { setUser(null); return; } const { error } = await createClient().auth.signOut(); if (error) throw error; setUser(null); }, [localPreview]);
  const requireLogin = useCallback(async (_reason?: string) => { if (localPreview) return false; if (user) return true; const path = `${window.location.pathname}${window.location.search}`; window.location.assign(`/login?next=${encodeURIComponent(path)}`); return false; }, [user, localPreview]);
  return <AuthContext.Provider value={{ user, loading, isGuest: !user, signIn, signOut, requireLogin }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used within AuthProvider'); return context; }
