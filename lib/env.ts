/**
 * Environment Variable Startup Validation
 *
 * In production, throws if required environment variables are missing.
 * In development, logs warnings instead of throwing.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length === 0) return;

  const message = `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(message);
  } else {
    console.warn(`[env] WARNING: ${message}`);
  }
}
