import test from 'node:test';
import assert from 'node:assert/strict';
import { appCommand } from './entry.mjs';
test('npm start app has one isolated local entry point', () => {
  assert.deepEqual(appCommand(['app'], 'linux'), { mode: 'sample', script: 'scripts/preview/start-retailer-preview.mjs', args: [], url: 'http://127.0.0.1:3002' });
});
test('production startup retains Next start and explicit port arguments', () => {
  assert.deepEqual(appCommand(['--port', '8080'], 'linux'), { mode: 'production', script: 'node_modules/next/dist/bin/next', args: ['start', '--port', '8080'] });
});
test('unknown app options and unsupported preview platforms fail clearly', () => {
  assert.throws(() => appCommand(['app', '--public'], 'linux'), /does not accept/);
  assert.throws(() => appCommand(['app'], 'win32'), /Linux/);
});
