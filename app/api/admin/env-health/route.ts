import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdminForApi, handleApiError } from '@/lib/api/auth-middleware';

export async function GET() {
  try {
    const admin = await requireAdminForApi();
    if (admin.error) return admin.error;

    const requiredKeys = [
      'DATABASE_URL', 'DIRECT_URL', 'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PII_ENCRYPTION_KEY',
    ];
    const optionalKeys = [
      'SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN', 'SHOPIFY_WEBHOOK_SECRET',
      'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SHIPPING_WEBHOOK_SECRET',
      'ADMIN_SUPER_ADMINS', 'ADMIN_OPERATORS', 'ADMIN_VIEWERS',
    ];
    const envChecks = [...requiredKeys, ...optionalKeys].map(key => ({
      key,
      required: requiredKeys.includes(key),
      configured: Boolean(process.env[key]),
      category: requiredKeys.includes(key) ? 'core' : 'operations',
      note: '',
    }));

    let databaseConnected = false;
    const databaseStartedAt = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      // Do not disclose database connection details through diagnostic responses.
    }
    const sharedLimiterConfigured = Boolean(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
    );
    const serviceChecks = [
      {
        key: 'database', label: 'Database',
        status: databaseConnected ? 'ok' : 'error',
        message: databaseConnected ? 'Connected' : 'Connection failed; inspect server logs',
        latencyMs: Date.now() - databaseStartedAt,
      },
      {
        key: 'pii-encryption', label: 'Customer data encryption',
        status: /^[a-f0-9]{64}$/i.test(process.env.PII_ENCRYPTION_KEY ?? '') ? 'ok' : 'error',
        message: /^[a-f0-9]{64}$/i.test(process.env.PII_ENCRYPTION_KEY ?? '') ? 'Configured' : 'A 32-byte encryption key is required',
      },
      {
        key: 'shared-state', label: 'Shared Rate Limits',
        status: sharedLimiterConfigured ? 'ok' : 'warning',
        message: sharedLimiterConfigured ? 'Shared limiter configured' : 'Configure Redis before serving multiple instances',
      },
    ];

    return NextResponse.json({
      summary: {
        env: {
          total: envChecks.length,
          configured: envChecks.filter(check => check.configured).length,
          required: requiredKeys.length,
          missingRequired: envChecks.filter(check => check.required && !check.configured).length,
        },
        services: {
          total: serviceChecks.length,
          ok: serviceChecks.filter(check => check.status === 'ok').length,
          warning: serviceChecks.filter(check => check.status === 'warning').length,
          error: serviceChecks.filter(check => check.status === 'error').length,
          skipped: 0,
        },
      },
      envChecks,
      serviceChecks,
      timestamp: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleApiError(error, 'Admin Env Health', 'Failed to fetch environment health');
  }
}
