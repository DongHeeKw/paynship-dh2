import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\r\n]/.test(value)) return '/';
  const allowed = ['/', '/purchase', '/orders', '/settings/delivery', '/admin/purchases', '/admin/support'];
  const path = value.split('?')[0];
  return allowed.some(base => path === base || (base !== '/' && path.startsWith(`${base}/`))) ? value : '/';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NODE_ENV === 'production' ? new URL(process.env.NEXT_PUBLIC_APP_URL!).origin : url.origin;
  const code = url.searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeReturnPath(url.searchParams.get('next')), origin));
  }
  return NextResponse.redirect(new URL('/login?error=callback', origin));
}
