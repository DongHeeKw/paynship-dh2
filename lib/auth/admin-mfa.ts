import { createClient } from '@/lib/supabase/server';

export type AdminMfaStatus = 'verified' | 'required' | 'unavailable';

// getAuthenticatorAssuranceLevel() decodes session storage. Authorization needs
// signature-verified claims tied to the user independently checked by getUser().
export async function verifyAdminMfa(userId: string): Promise<AdminMfaStatus> {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims || data.claims.sub !== userId) return 'unavailable';
    return data.claims.aal === 'aal2' ? 'verified' : 'required';
  } catch {
    return 'unavailable';
  }
}
