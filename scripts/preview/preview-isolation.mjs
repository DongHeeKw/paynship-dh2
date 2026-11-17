import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

export function copyPreviewSources(root, snapshot, paths) {
  for (const name of paths) {
    // Ignore real environment files even if one was accidentally tracked by git.
    const filename = basename(name);
    if (/^\.env(?:$|\.)/.test(filename) && filename !== '.env.example') continue;
    const source = join(root, name);
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    const target = join(snapshot, name);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
}

export function isolatedPreviewCommand(root, nodeExecutable = process.execPath) {
  // Clear the systemd manager's environment as well as the launching shell's.
  // Explicit blanks also prevent shared dependencies' dotenv loaders from
  // activating an actual backend through their original installation path.
  const disabledBackends = ['DATABASE_URL', 'DIRECT_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY', 'PII_ENCRYPTION_KEY', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
    'SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_ACCESS_TOKEN', 'SHOPIFY_WEBHOOK_SECRET', 'SHIPPING_WEBHOOK_SECRET',
    'ADMIN_SUPER_ADMINS', 'ADMIN_OPERATORS', 'ADMIN_VIEWERS'].map(name => name + '=');
  return ['/usr/bin/env', '-i', 'PATH=' + dirname(nodeExecutable) + ':/usr/bin:/bin',
    'NODE_ENV=development', 'PAYNSHIP_DEV_PREVIEW=1', 'NEXT_TELEMETRY_DISABLED=1',
    'NEXT_PUBLIC_APP_URL=http://127.0.0.1:3002',
    'PAYNSHIP_WORKSPACE_DATA_DIR=' + join(root, 'data/samples'), ...disabledBackends,
    nodeExecutable, join(root, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3002'];
}
