import { createClient } from '@supabase/supabase-js';
import { PurchaseError } from '@/lib/purchases/errors';

/** Machine API authentication; browser cookies are never accepted here. */
export async function resellerUser(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const match = /^Bearer ([A-Za-z0-9._~-]{1,8192})$/i.exec(authorization);
  if (!match) throw new PurchaseError(401, 'A valid account access token is required.');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new PurchaseError(503, 'Account authentication is not configured.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: { user }, error } = await client.auth.getUser(match[1]);
  if (error || !user?.email || !user.email_confirmed_at) throw new PurchaseError(401, 'A verified account access token is required.');
  return user;
}
