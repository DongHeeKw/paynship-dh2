import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { copyPreviewSources, isolatedPreviewCommand } from '../preview/preview-isolation.mjs';

// Reuse the sample app's isolation: no .env files, inherited credentials or real backend.
const root = resolve('.');
mkdirSync(join(root, '.tools'), { recursive: true });
const snapshot = mkdtempSync(join(root, '.tools/consolidation-ci.'));
const paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
copyPreviewSources(root, snapshot, paths);
symlinkSync(join(root, 'node_modules'), join(snapshot, 'node_modules'), 'dir');
const command = isolatedPreviewCommand(root).map((arg) => {
  if (arg === '3002') return '3102';
  if (arg === 'NEXT_PUBLIC_APP_URL=http://127.0.0.1:3002') return 'NEXT_PUBLIC_APP_URL=http://127.0.0.1:3102';
  return arg;
});
const child = spawn(command[0], command.slice(1), { cwd: snapshot, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => { rmSync(snapshot, { recursive: true, force: true }); process.exitCode = code ?? 0; });
