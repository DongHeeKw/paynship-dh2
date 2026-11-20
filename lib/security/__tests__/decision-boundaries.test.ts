import { afterEach, expect, it, vi } from 'vitest';
import { isTrustedMutation } from '../csrf';
import { devPreviewAllowed } from '@/lib/dev-preview/access';
import { resolveAdminRole } from '@/lib/auth/admin-role';
afterEach(() => vi.unstubAllEnvs());
it.each([
  [undefined, false, {}, true], [undefined, false, { cookie: 'session=example' }, false],
  ['https://paynship.example', false, { referer: 'https://paynship.example/account' }, true],
  ['https://paynship.example', false, { referer: 'https://attacker.invalid/' }, false],
  ['https://paynship.example', false, { referer: 'invalid' }, false],
  [undefined, true, { origin: 'http://localhost:3000' }, true],
  [undefined, false, { origin: 'http://localhost:3000' }, false],
  ['invalid', false, { origin: 'https://paynship.example' }, false],
] as const)('mutation origin policy %s development=%s headers=%j => %s', (appUrl, development, headers, expected) => {
  expect(isTrustedMutation(new Request('https://paynship.example/api/test', { method: 'POST', headers: headers as Record<string, string> }), appUrl, development)).toBe(expected);
});
it.each([[null, false], ['localhost', true], ['localhost:0', false], ['localhost:1', true],
  ['localhost:65535', true], ['localhost:65536', false], ['localhost:99999', false]] as const)('preview host %s => %s', (host, expected) => {
  expect(devPreviewAllowed('development', '1', host)).toBe(expected);
});
it('never maps empty administrator identifiers even when environment contains empty entries', () => {
  vi.stubEnv('ADMIN_SUPER_ADMINS', ',,'); vi.stubEnv('ADMIN_OPERATORS', ''); vi.stubEnv('ADMIN_VIEWERS', 'real-user');
  expect(resolveAdminRole(true, '', '')).toBeNull();
  expect(resolveAdminRole(true, 'real-user', '')).toBe('viewer');
});
