import { describe, expect, it, vi } from 'vitest';
import { developerWorkspaceAllowed, isDeveloperWorkspacePath, readWorkspaceBody, workspaceMutationOriginAllowed } from '../access';

describe('developer workspace request boundary', () => {
  it('requires development, explicit opt-in and a real loopback Host', () => {
    const headers = new Headers({ host: '127.0.0.1:3001', 'x-paynship-dev-preview': '1' });
    expect(developerWorkspaceAllowed(headers, 'development', '1')).toBe(true);
    expect(developerWorkspaceAllowed(headers, 'production', '1')).toBe(false);
    expect(developerWorkspaceAllowed(headers, 'test', '1')).toBe(false);
    expect(developerWorkspaceAllowed(headers, 'development', '0')).toBe(false);
    headers.set('host', 'public.example');
    headers.set('x-forwarded-host', '127.0.0.1:3001');
    expect(developerWorkspaceAllowed(headers, 'development', '1')).toBe(false);
  });

  it('allows only the workspace page and data route to receive the trusted preview header', () => {
    expect(isDeveloperWorkspacePath('/dev/workspace')).toBe(true);
    expect(isDeveloperWorkspacePath('/dev/workspace/data')).toBe(true);
    for (const path of ['/api/purchases', '/dev/workspace/data/admin', '/dev/workspace-other', '/orders']) {
      expect(isDeveloperWorkspacePath(path)).toBe(false);
    }
  });

  it.each(['http://127.0.0.1:3001', 'http://localhost:3001', 'http://[::1]:3001'])('accepts its exact loopback origin %s', origin => {
    const request = new Request(origin + '/dev/workspace/data', { method: 'POST', headers: { host: new URL(origin).host, origin } });
    expect(workspaceMutationOriginAllowed(request)).toBe(true);
  });

  it.each([null, 'null', 'http://127.0.0.1:3002', 'http://localhost:3001', 'https://127.0.0.1:3001', 'http://127.0.0.1:3001/', 'http://127.0.0.1:3001.attacker.test', 'http://user@127.0.0.1:3001'])('rejects missing or nonmatching origin %s', origin => {
    const headers = new Headers({ host: '127.0.0.1:3001', referer: 'http://127.0.0.1:3001/dev/workspace' });
    if (origin !== null) headers.set('origin', origin);
    const request = new Request('http://127.0.0.1:3001/dev/workspace/data', { method: 'POST', headers });
    expect(workspaceMutationOriginAllowed(request)).toBe(false);
  });

  it('bounds actual streamed bytes when content-length is missing or understates the body', async () => {
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"message":"' + 'x'.repeat(8200) + '"}'));
      controller.close();
    } });
    const request = new Request('http://127.0.0.1:3001/dev/workspace/data', {
      method: 'POST', headers: { 'content-type': 'application/json', 'content-length': '1' }, body, duplex: 'half',
    } as RequestInit);
    await expect(readWorkspaceBody(request)).rejects.toMatchObject({ status: 413 });
  });

  it('rejects non-JSON input and malformed JSON before any action can run', async () => {
    const url = 'http://127.0.0.1:3001/dev/workspace/data';
    await expect(readWorkspaceBody(new Request(url, { method: 'POST', body: '{}' }))).rejects.toMatchObject({ status: 415 });
    await expect(readWorkspaceBody(new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' }))).rejects.toMatchObject({ status: 400 });
  });

  it('cancels a stalled body after the bounded reading deadline', async () => {
    vi.useFakeTimers();
    try {
      const cancel = vi.fn();
      const body = new ReadableStream({ cancel });
      const request = new Request('http://127.0.0.1:3001/dev/workspace/data', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half',
      } as RequestInit);
      const reading = expect(readWorkspaceBody(request)).rejects.toMatchObject({ status: 408 });
      await vi.advanceTimersByTimeAsync(5000);
      await reading;
      expect(cancel).toHaveBeenCalledOnce();
    } finally { vi.useRealTimers(); }
  });
});
