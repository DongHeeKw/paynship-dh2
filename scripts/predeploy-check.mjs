import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--with-lint')) {
  console.error('[predeploy] Supported option: --with-lint');
  process.exit(1);
}
const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts ?? {};
const steps = ['type-check', 'docs:check', 'test:ci', 'product:evidence:test', 'build'];
if (args.includes('--with-lint')) {
  if (!scripts.lint || /\bnext\s+lint\b/.test(scripts.lint)) {
    console.error('[predeploy] Configure a working ESLint command before --with-lint.');
    process.exit(1);
  }
  steps.unshift('lint');
}
for (const step of steps) {
  if (!scripts[step]) {
    console.error('[predeploy] Missing npm script: ' + step);
    process.exit(1);
  }
  console.log('[predeploy] ' + step);
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', step], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    console.error('[predeploy] Failed: ' + step);
    process.exit(result.status || 1);
  }
}
console.log('[predeploy] Source checks passed; database, provider and authenticated release gates remain separate.');
