import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isTrustedMutation } from '../csrf';
import { securityHeaders } from '../response-headers';
import { verifyWebhookSignature } from '../webhook';

describe('request security boundaries', () => {
  it.each(['https://shop.example.attacker.test', 'https://localhost.attacker.test', 'null'])('rejects forged browser origins %s', origin => {
    const request = new Request('https://shop.example/api/purchases', { method: 'POST', headers: { cookie: 'session=x', origin } });
    expect(isTrustedMutation(request, 'https://shop.example', false)).toBe(false);
  });
  it('requires origin for cookie-authenticated mutation and accepts the exact trusted origin', () => {
    const request = new Request('https://shop.example/api/purchases', { method: 'POST', headers: { cookie: 'session=x' } });
    expect(isTrustedMutation(request, 'https://shop.example', false)).toBe(false);
    request.headers.set('origin', 'https://shop.example');
    expect(isTrustedMutation(request, 'https://shop.example', false)).toBe(true);
  });
  it('uses a production script nonce, frame isolation and no-store-ready security headers', () => {
    const headers = new Headers(); securityHeaders(headers, false, 'https://project.supabase.co', 'testnonce');
    const script = headers.get('content-security-policy')!.split(';')[1];
    expect(script).toContain('nonce-testnonce'); expect(script).not.toContain('unsafe-inline'); expect(script).not.toContain('unsafe-eval');
    expect(headers.get('content-security-policy')).not.toContain('unsafe-inline');
    expect(headers.get('content-security-policy')).toContain("object-src 'none'");
    expect(headers.get('content-security-policy')).toContain("img-src 'self';");
    expect(headers.get('x-frame-options')).toBe('DENY'); expect(headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('accepts only the exact signed body; rejects missing keys and malformed signatures', () => {
    const raw = Buffer.from('{"order":1}'); const secret = 'test-webhook-secret';
    const signature = createHmac('sha256', secret).update(raw).digest('base64');
    expect(verifyWebhookSignature(raw, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(Buffer.from('{"order":2}'), signature, secret)).toBe(false);
    expect(verifyWebhookSignature(raw, signature, '')).toBe(false);
    expect(verifyWebhookSignature(raw, 'garbage', secret)).toBe(false);
  });
  it('permits an authenticator QR image without loosening script or object restrictions', () => {
    const headers = new Headers(); securityHeaders(headers, false, undefined, 'mfa-nonce', true);
    expect(headers.get('content-security-policy')).toContain("img-src 'self' data:");
    expect(headers.get('content-security-policy')).toContain("script-src 'self' 'nonce-mfa-nonce' 'strict-dynamic'");
    expect(headers.get('content-security-policy')).toContain("object-src 'none'");
  });
  it('permits local preview hot reload on its actual port without adding development sockets in production', () => {
    const local = new Headers(); securityHeaders(local, true, undefined, undefined, false, 'http://127.0.0.1:3001');
    expect(local.get('content-security-policy')).toContain('ws://127.0.0.1:3001');
    const remote = new Headers(); securityHeaders(remote, true, undefined, undefined, false, 'http://localhost.attacker.test:3001');
    expect(remote.get('content-security-policy')).not.toContain('attacker.test');
    const production = new Headers(); securityHeaders(production, false, undefined, 'nonce', false, 'http://127.0.0.1:3001');
    expect(production.get('content-security-policy')).not.toContain('ws://');
  });
});
