import { devPreviewAllowed } from '@/lib/dev-preview/access';

export const WORKSPACE_BODY_LIMIT = 8192;

export class WorkspaceBoundaryError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function isDeveloperWorkspacePath(path: string): boolean {
  return path === '/dev/workspace' || path === '/dev/workspace/data';
}

export function developerWorkspaceAllowed(headers: Headers, mode = process.env.NODE_ENV, enabled = process.env.PAYNSHIP_DEV_PREVIEW): boolean {
  return devPreviewAllowed(mode, enabled, headers.get('host'));
}

export function workspaceMutationOriginAllowed(request: Request): boolean {
  const authority = request.headers.get('host');
  const origin = request.headers.get('origin');
  if (!authority || !origin || !devPreviewAllowed('development', '1', authority)) return false;
  try {
    const protocol = new URL(request.url).protocol;
    if (!['http:', 'https:'].includes(protocol)) return false;
    const expected = new URL(`${protocol}//${authority}`).origin;
    // An Origin is a canonical origin only: no credentials, path or trailing slash.
    return origin === expected && new URL(origin).origin === origin;
  } catch { return false; }
}

export async function readWorkspaceBody(request: Request): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    throw new WorkspaceBoundaryError(415, 'Send a JSON workspace action.');
  }
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null && !/^\d+$/.test(declaredLength)) throw new WorkspaceBoundaryError(400, 'Invalid request length.');
  if (declaredLength !== null && Number(declaredLength) > WORKSPACE_BODY_LIMIT) throw new WorkspaceBoundaryError(413, 'Workspace action is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new WorkspaceBoundaryError(400, 'Workspace action is missing.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 5000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new WorkspaceBoundaryError(408, 'Workspace action timed out.');
      if (done) break;
      size += value.byteLength;
      if (size > WORKSPACE_BODY_LIMIT) throw new WorkspaceBoundaryError(413, 'Workspace action is too large.');
      chunks.push(value);
    }
  } finally {
    clearTimeout(deadline);
    await reader.cancel().catch(() => {});
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new WorkspaceBoundaryError(400, 'Invalid workspace JSON.'); }
}
