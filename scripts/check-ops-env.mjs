import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

const mode = process.argv[2] ?? 'production';
if (!['production', 'development', 'multi-instance', 'production-multi'].includes(mode)) {
  console.error('[ops-check] Use production or development.');
  process.exit(1);
}
const production = mode !== 'development';
loadEnvConfig(process.cwd(), !production);
const required = ['DATABASE_URL', 'DIRECT_URL', 'NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PII_ENCRYPTION_KEY'];
if (production) required.push('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN', 'SHOPIFY_WEBHOOK_SECRET', 'SHIPPING_WEBHOOK_SECRET');
const errors = required.filter(name => !process.env[name]?.trim()).map(name => name + ' is required');
if (process.env.PII_ENCRYPTION_KEY && !/^[a-f0-9]{64}$/i.test(process.env.PII_ENCRYPTION_KEY)) errors.push('PII_ENCRYPTION_KEY must be 64 hexadecimal characters');
for (const name of ['DATABASE_URL', 'DIRECT_URL']) {
  const value = process.env[name] ?? '';
  if (!value) continue;
  try {
    const parsed = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) errors.push(name + ' must be a PostgreSQL URL');
    if (/\[(?:PROJECT_REF|PASSWORD|RUNTIME_PASSWORD|REGION|DATABASE_HOST|DATABASE_NAME)\]/i.test(value)) errors.push(name + ' contains a placeholder');
  } catch { errors.push(name + ' is not a valid URL'); }
}
for (const name of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'UPSTASH_REDIS_REST_URL']) {
  const value = process.env[name];
  if (!value) continue;
  try {
    const parsed = new URL(value);
    if (production && parsed.protocol !== 'https:') errors.push(name + ' must use HTTPS in production');
    if (parsed.username || parsed.password) errors.push(name + ' must not contain URL credentials');
  } catch { errors.push(name + ' is not a valid URL'); }
}
if (process.env.SHOPIFY_STORE_DOMAIN && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(process.env.SHOPIFY_STORE_DOMAIN)) errors.push('SHOPIFY_STORE_DOMAIN must be an exact myshopify.com store host');
if (production && !['ADMIN_SUPER_ADMINS', 'ADMIN_OPERATORS'].some(name => process.env[name]?.trim())) errors.push('Map at least one server operator using ADMIN_SUPER_ADMINS or ADMIN_OPERATORS');
if (process.env.SHOPIFY_API_VERSION && !/^\d{4}-(01|04|07|10)$/.test(process.env.SHOPIFY_API_VERSION)) errors.push('SHOPIFY_API_VERSION must be YYYY-01/04/07/10');
if (errors.length) {
  for (const message of errors) console.error('[ops-check] ' + message);
  process.exit(1);
}
console.log('[ops-check] ' + mode + ' environment shape checked; no secrets printed.');
console.log('[ops-check] This does not prove DB migration, Auth, carrier or payment connectivity.');
