import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { customerReturnPath } from '@/lib/auth/customer-redirect';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NODE_ENV === 'production' ? new URL(process.env.NEXT_PUBLIC_APP_URL!).origin : url.origin;
  const next = customerReturnPath(url.searchParams.get('next'));
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  let destination: URL | undefined;

  if (tokenHash && /^[A-Za-z0-9_-]{32,256}$/.test(tokenHash) && (type === 'email' || type === 'signup')) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) {
        const { data, error: userError } = await supabase.auth.getUser();
        if (!userError && data.user?.email && data.user.email_confirmed_at) destination = new URL(next, origin);
        else await supabase.auth.signOut({ scope: 'local' });
      }
    } catch {
      // Never put the one-time token or the provider's response in a redirect.
    }
  }
  if (!destination) {
    destination = new URL('/login', origin);
    destination.searchParams.set('error', 'callback');
    destination.searchParams.set('next', next);
  }
  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
