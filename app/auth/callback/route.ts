import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { customerReturnPath } from '@/lib/auth/customer-redirect';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NODE_ENV === 'production' ? new URL(process.env.NEXT_PUBLIC_APP_URL!).origin : url.origin;
  const code = url.searchParams.get('code');
  const next = customerReturnPath(url.searchParams.get('next'), '/');
  if (code && code.length <= 4096 && !url.searchParams.has('error') && !url.searchParams.has('error_code')) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const { data, error: userError } = await supabase.auth.getUser();
        if (!userError && data.user?.email && data.user.email_confirmed_at) return NextResponse.redirect(new URL(next, origin));
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch {
      // Expired/missing verifiers and provider failures return to a safe account screen.
    }
  }
  const failure = new URL('/login', origin);
  if (url.searchParams.get('error_code') === 'provider_email_needs_verification') {
    failure.searchParams.set('notice', 'confirm-email');
  } else {
    failure.searchParams.set('error', 'callback');
  }
  failure.searchParams.set('next', next);
  return NextResponse.redirect(failure);
}
