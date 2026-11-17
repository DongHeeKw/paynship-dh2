import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { copyPreviewSources, isolatedPreviewCommand } from './preview-isolation.mjs';
import { warmPreviewServer } from './preview-readiness.mjs';

if (process.platform !== 'linux' || Number(process.versions.node.split('.')[0]) < 24) throw new Error('Use Linux with Node 24 or newer.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
execFileSync(process.execPath, [join(root, 'scripts/samples/create-developer-workspace.mjs')], { cwd: root, stdio: 'inherit' });
console.log('Workspace: ' + root);
const unit = 'paynship-dh2-sample-preview.service';
const description = 'PayNShip dh2 fictional retailer preview (loopback only)';
const show = property => spawnSync('systemctl', ['--user', 'show', unit, '-p', property, '--value'], { encoding: 'utf8' }).stdout?.trim();
if (show('LoadState') === 'loaded') {
  if (show('Description') !== description) throw new Error('An unrelated preview service already uses this unit name.');
  execFileSync('systemctl', ['--user', 'stop', unit], { stdio: 'inherit' });
  spawnSync('systemctl', ['--user', 'reset-failed', unit], { stdio: 'ignore' });
}
await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', () => reject(new Error('Port 3002 is occupied. Leave the existing process running and inspect it first.')));
  probe.listen(3002, '127.0.0.1', () => probe.close(resolve));
});
const tools = join(root, '.tools'); mkdirSync(tools, { recursive: true });
const snapshot = mkdtempSync(join(tools, 'retailer-preview.')); chmodSync(snapshot, 0o700);
const paths = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
copyPreviewSources(root, snapshot, paths);
symlinkSync(join(root, 'node_modules'), join(snapshot, 'node_modules'), 'dir');
execFileSync('systemd-run', [
  '--user', '--collect', '--unit=' + unit, '--description=' + description,
  '--property=WorkingDirectory=' + snapshot, '--property=UMask=0077', '--property=NoNewPrivileges=yes',
  ...isolatedPreviewCommand(root),
], { stdio: 'inherit' });
console.log('Compiling the local customer workspace and checking its browser scripts…');
const ready = await warmPreviewServer('http://127.0.0.1:3002');
console.log('Local sample workspace available; checked ' + ready.scripts + ' complete browser scripts.');
console.log('Developer workspace: http://127.0.0.1:3002/dev/workspace');
console.log('Classic form preview: http://127.0.0.1:3002/dev/preview');
console.log('Source snapshot is independent of the production build. Re-run this command after editing source.');
console.log('Real environment files and inherited provider credentials are excluded.');
console.log('Stop: systemctl --user stop ' + unit);
