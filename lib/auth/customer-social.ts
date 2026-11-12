'use client';

import type { Provider } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { customerAuthConfigured, customerAuthOriginError } from './customer-auth';
import { buildOAuthRedirectTo } from './oauth-client';

export type CustomerSocialProvider = 'google' | 'apple' | 'naver';
const LABELS = { google: 'Google', apple: 'Apple', naver: 'Naver' } as const;

export function getCustomerSocialProviderStatus(provider: CustomerSocialProvider): { available: boolean; message?: string } {
  const available = provider === 'google'
    || (provider === 'apple' && process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === 'true')
    || (provider === 'naver' && process.env.NEXT_PUBLIC_NAVER_AUTH_ENABLED === 'true');
  return available ? { available } : { available: false, message: `${LABELS[provider] ?? 'This provider'} sign-in is coming soon. Please use another option.` };
}

export async function startCustomerSocialSignIn(provider: CustomerSocialProvider, nextPath = '/'): Promise<void> {
  const originError = customerAuthOriginError();
  if (originError) throw new Error(originError);
  if (!['google', 'apple', 'naver'].includes(provider)) throw new Error('Choose a supported sign-in option.');
  const status = getCustomerSocialProviderStatus(provider);
  if (!status.available) throw new Error(status.message);
  if (!customerAuthConfigured()) throw new Error('Sign in is not configured yet.');

  // This installed SDK predates custom-provider types, but its OAuth/PKCE URL
  // builder accepts the documented custom: identifier unchanged. Only this
  // fixed identifier is permitted; no caller-controlled provider or URL is used.
  const supabaseProvider: Provider = provider === 'naver' ? 'custom:naver' as Provider : provider;
  try {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: supabaseProvider,
      options: { redirectTo: buildOAuthRedirectTo(nextPath) },
    });
    if (error) throw error;
  } catch {
    throw new Error(`${LABELS[provider]} sign-in could not start. Please try again or choose another option.`);
  }
}
