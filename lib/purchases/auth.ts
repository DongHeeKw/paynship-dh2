import { createClient } from '@/lib/supabase/server';
import { PurchaseError } from './errors';

export async function purchaseUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email || !user.email_confirmed_at) throw new PurchaseError(401, 'Sign in with a verified account to continue.');
  return user;
}
