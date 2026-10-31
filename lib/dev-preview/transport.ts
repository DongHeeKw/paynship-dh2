import type { requestJson } from '@/components/purchases/api';
import { createPreviewStore } from './store';

// There is deliberately no fetch import, real API fallback, cookie, token,
// database connection or browser storage in this adapter.
export function createPreviewTransport(): typeof requestJson {
  const store = createPreviewStore();
  return async function request<T>(path: string, init?: RequestInit): Promise<T> {
    if (init?.signal?.aborted) throw new DOMException('Preview request aborted.', 'AbortError');
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Only local preview routes are available.');
    const url = new URL(path, 'http://preview.invalid');
    const method = init?.method?.toUpperCase() ?? 'GET';
    let body: unknown;
    if (init?.body != null) {
      if (typeof init.body !== 'string' || new TextEncoder().encode(init.body).length > 8192) throw new Error('Preview request body is too large.');
      body = JSON.parse(init.body);
    }
    let result: unknown;
    if (url.pathname === '/api/delivery-profile') {
      if (method === 'GET') result = { profile: store.getProfile() };
      else if (method === 'PUT') result = { profile: store.saveProfile(body) };
      else if (method === 'DELETE') { store.deleteProfile(); result = { success: true }; }
      else throw new Error('This operation is unavailable in local preview.');
    } else if (url.pathname === '/api/purchases') {
      if (method === 'GET') result = { requests: store.list(), nextCursor: null };
      else if (method === 'POST') result = { request: store.create(body) };
      else throw new Error('This operation is unavailable in local preview.');
    } else {
      const route = /^\/api\/purchases\/([0-9a-f-]{36})(?:\/(cancel|support))?$/i.exec(url.pathname);
      if (!route) throw new Error('Real payments, administration and external services are unavailable in local preview.');
      if (!route[2] && method === 'GET') result = { request: store.get(route[1]) };
      else if (route[2] === 'cancel' && method === 'POST') result = { request: store.cancel(route[1], body) };
      else if (route[2] === 'support' && method === 'POST') result = { ticket: store.support(route[1], body) };
      else throw new Error('This operation is unavailable in local preview.');
    }
    return result as T;
  };
}
