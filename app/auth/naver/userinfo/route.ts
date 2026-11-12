import { handleNaverUserinfo } from '@/lib/auth/naver-userinfo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase calls this using the Naver access token after its OAuth code exchange.
// This endpoint adapts claims only; it never creates a PayNShip session.
export async function GET(request: Request): Promise<Response> {
  return handleNaverUserinfo(request);
}
