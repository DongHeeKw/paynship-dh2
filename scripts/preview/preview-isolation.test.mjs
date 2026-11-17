import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { copyPreviewSources, isolatedPreviewCommand } from './preview-isolation.mjs';

test('preview snapshot and child process exclude local and inherited credentials', { skip: process.platform !== 'linux' }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'paynship-preview-isolation-'));
  try {
    const root = join(directory, 'source');
    const snapshot = join(directory, 'snapshot');
    const paths = ['.env', '.env.local', '.env.production', '.env.example', 'nested/.env.development', 'app/page.tsx'];
    for (const name of paths) {
      const path = join(root, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, name.startsWith('app/') ? 'source fixture' : 'environment fixture');
    }
    copyPreviewSources(root, snapshot, paths);
    for (const name of paths.filter(name => name !== '.env.example' && name !== 'app/page.tsx')) {
      assert.equal(existsSync(join(snapshot, name)), false, name);
    }
    assert.equal(readFileSync(join(snapshot, '.env.example'), 'utf8'), 'environment fixture');
    assert.equal(readFileSync(join(snapshot, 'app/page.tsx'), 'utf8'), 'source fixture');

    // Stand in for Next, while executing the same isolated command as the service.
    const next = join(root, 'node_modules/next/dist/bin/next');
    mkdirSync(dirname(next), { recursive: true });
    writeFileSync(next, 'process.stdout.write(JSON.stringify(process.env));');
    const [executable, ...args] = isolatedPreviewCommand(root);
    const actual = JSON.parse(execFileSync(executable, args, { encoding: 'utf8', env: {
      ...process.env, DATABASE_URL: 'fixture-private-database', DIRECT_URL: 'fixture-private-direct',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-private-auth', SHOPIFY_ADMIN_ACCESS_TOKEN: 'fixture-private-payment',
      PII_ENCRYPTION_KEY: 'fixture-private-pii', UNEXPECTED_PROVIDER_SECRET: 'fixture-private-extra',
    } }));
    assert.deepEqual(actual, {
      PATH: dirname(process.execPath) + ':/usr/bin:/bin', NODE_ENV: 'development', PAYNSHIP_DEV_PREVIEW: '1',
      NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3002',
      PAYNSHIP_WORKSPACE_DATA_DIR: join(root, 'data/samples'),
      DATABASE_URL: '', DIRECT_URL: '', NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '', PII_ENCRYPTION_KEY: '', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '',
      SHOPIFY_STORE_DOMAIN: '', SHOPIFY_ADMIN_ACCESS_TOKEN: '', SHOPIFY_WEBHOOK_SECRET: '', SHIPPING_WEBHOOK_SECRET: '',
      ADMIN_SUPER_ADMINS: '', ADMIN_OPERATORS: '', ADMIN_VIEWERS: '',
    });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
