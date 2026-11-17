import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appCommand } from './entry.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
try {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('PayNShip requires Node 24 or newer.');
  const command = appCommand(process.argv.slice(2));
  const child = spawn(process.execPath, [resolve(root, command.script), ...command.args], { cwd: root, stdio: 'inherit', env: process.env });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', code => {
    process.exitCode = code ?? 1;
    if (code !== 0 || command.mode !== 'sample') return;
    console.log('\nOpen PayNShip: ' + command.url);
    console.log('Sample customer workspace: ' + command.url + '/dev/workspace');
    if (!process.env.CI && process.env.PAYNSHIP_NO_OPEN !== '1') {
      // Desktop environments may be absent (SSH/CI); the printed link still works.
      const opened = spawnSync('xdg-open', [command.url], { stdio: 'ignore', timeout: 5000 });
      if (opened.error || opened.status !== 0) console.log('Open the link above in your browser.');
    }
  });
} catch (error) { console.error(error.message); process.exitCode = 1; }
