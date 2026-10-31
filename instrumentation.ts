/**
 * Next.js Instrumentation
 *
 * Runs once on server startup. Validates required environment variables.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  const { validateEnv } = await import('@/lib/env');
  validateEnv();
}
