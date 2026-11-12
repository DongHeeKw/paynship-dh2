'use client';

import { createClient } from '@/lib/supabase/client';
import { buildOAuthRedirectTo } from './oauth-client';

export const CUSTOMER_PASSWORD_MIN = 8;
export const CUSTOMER_PASSWORD_MAX = 72;
export const CUSTOMER_EMAIL_MAX = 254;

type Credentials = { email: string; password: string };
export type CustomerAuthResult = { status: 'authenticated' } | { status: 'confirmation' } | { status: 'error'; message: string };

export function customerAuthOriginAllowed(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.username || url.password) return false;
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  } catch {
    return false;
  }
}

export function customerAuthOriginError(): string | null {
  return typeof window !== 'undefined' && customerAuthOriginAllowed(window.location.origin) ? null : 'Use the secure HTTPS address to sign in or create an account.';
}

export function customerAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function credentialsError({ email, password }: Credentials, signup: boolean): string | null {
  if (email.length > CUSTOMER_EMAIL_MAX || /[\u0000-\u0020\u007f]/.test(email) || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return 'Enter a valid email address.';
  if (!password || password.length > CUSTOMER_PASSWORD_MAX || (signup && password.length < CUSTOMER_PASSWORD_MIN)) return signup ? `Choose a password with ${CUSTOMER_PASSWORD_MIN}–${CUSTOMER_PASSWORD_MAX} characters.` : 'Check your email and password, then try again.';
  return null;
}

export async function signInWithEmail(credentials: Credentials): Promise<CustomerAuthResult> {
  const originError = customerAuthOriginError();
  if (originError) return { status: 'error', message: originError };
  const input = { email: credentials.email.trim(), password: credentials.password };
  const invalid = credentialsError(input, false);
  if (invalid) return { status: 'error', message: invalid };
  if (!customerAuthConfigured()) return { status: 'error', message: 'Sign in is not available yet. Please try again later.' };
  try {
    const client = createClient();
    const { data, error } = await client.auth.signInWithPassword(input);
    // Do not reveal whether an address exists, has a password, or uses Google.
    if (error) return { status: 'error', message: 'We couldn’t sign you in. Check your details and confirm your email, or try Google.' };
    if (!data.session || !data.user?.email || !data.user.email_confirmed_at) {
      if (data.session) await client.auth.signOut({ scope: 'local' });
      return { status: 'error', message: 'Confirm your email before signing in. Open the confirmation link in the browser where you signed up.' };
    }
    return { status: 'authenticated' };
  } catch {
    return { status: 'error', message: 'We couldn’t reach sign in. Please try again shortly.' };
  }
}

export async function signUpWithEmail(credentials: Credentials, nextPath: string): Promise<CustomerAuthResult> {
  const originError = customerAuthOriginError();
  if (originError) return { status: 'error', message: originError };
  const input = { email: credentials.email.trim(), password: credentials.password };
  const invalid = credentialsError(input, true);
  if (invalid) return { status: 'error', message: invalid };
  if (!customerAuthConfigured()) return { status: 'error', message: 'Account creation is not available yet. Please try again later.' };
  try {
    const client = createClient();
    const { data, error } = await client.auth.signUp({ ...input, options: { emailRedirectTo: buildOAuthRedirectTo(nextPath) } });
    if (error) {
      // Match Supabase's concealed existing-account response without disclosing an account.
      if (error.code === 'user_already_exists' || error.code === 'email_exists') return { status: 'confirmation' };
      return { status: 'error', message: 'We couldn’t complete sign up. Please try again shortly or continue with Google.' };
    }
    if (data.session) {
      if (data.user?.email && data.user.email_confirmed_at) return { status: 'authenticated' };
      await client.auth.signOut({ scope: 'local' });
    }
    return { status: 'confirmation' };
  } catch {
    return { status: 'error', message: 'We couldn’t reach sign up. Please try again shortly.' };
  }
}
