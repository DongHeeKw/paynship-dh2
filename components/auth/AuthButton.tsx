'use client';

import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthButtonProps {
  className?: string;
}

export function AuthButton({ className }: AuthButtonProps) {
  const { signIn } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [signInError, setSignInError] = useState('');

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setSignInError('');
    try {
      await signIn();
    } catch (error) {
      console.error('Google sign-in could not start:', error);
      setSignInError('Google sign-in could not start. Check the provider setup and try again.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setLoading(false);
    setShowMenu(false);
  };

  if (loading) {
    return (
      <div className={`h-10 w-10 rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel)] animate-pulse ${className}`} />
    );
  }

  if (user) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="h-10 w-10 overflow-hidden rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel)] shadow-[0_12px_24px_rgba(38,33,28,0.08)] transition-all hover:border-[var(--chat-border-strong)] hover:shadow-[0_18px_32px_rgba(38,33,28,0.12)] hover:scale-[1.02] active:scale-95"
        >
          {user.user_metadata.avatar_url && !avatarError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setAvatarError(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--chat-accent)_0%,var(--chat-secondary)_100%)] text-sm font-bold text-white">
              {(user.user_metadata.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </div>
          )}
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-12 z-50 w-52 animate-slide-up rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel-strong)] py-2 shadow-[0_24px_48px_rgba(27,22,18,0.14)] backdrop-blur-xl">
              <div className="border-b border-[var(--chat-border)] px-4 py-3">
                <p className="truncate text-sm font-medium text-[var(--chat-ink)]">
                  {user.user_metadata.full_name || 'User'}
                </p>
                <p className="truncate text-xs text-[var(--chat-ink-muted)]">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[var(--chat-ink-soft)] transition-colors hover:bg-[var(--chat-surface-soft)] hover:text-[var(--chat-ink)]"
              >
                <i className="fas fa-sign-out-alt text-[var(--chat-ink-muted)]"></i>
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
    <button
      onClick={() => void handleSignIn()}
      className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-panel)] shadow-[0_12px_24px_rgba(38,33,28,0.08)] transition-all hover:bg-[var(--chat-panel-strong)] hover:border-[var(--chat-border-strong)] hover:shadow-[0_18px_32px_rgba(38,33,28,0.12)] hover:scale-[1.02] active:scale-95 ${className}`}
      title="Sign in with Google"
      aria-label="Sign in with Google"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    </button>
    {signInError && <p role="alert" className="error-message">{signInError}</p>}
    </>
  );
}
