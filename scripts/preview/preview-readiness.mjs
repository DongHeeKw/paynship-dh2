import { createHash } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { Script } from 'node:vm';

// The first Next development compilation can rewrite shared chunks while a
// browser is reading them. Compile public entry pages and both previews, then check stable
// scripts before advertising this immutable source snapshot to the developer.
export async function warmPreviewServer(input, { timeoutMs = 90000 } = {}) {
  const origin = new URL(input);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || origin.protocol !== 'http:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Preview readiness requires a loopback HTTP origin.');
  }
  const deadline = Date.now() + timeoutMs;
  const paths = ['/', '/products', '/dev/preview', '/dev/workspace', '/dev/workspace/data'];
  async function read(path, limit, contentType) {
    const response = await fetch(new URL(path, origin), { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - Date.now()))) });
    if (!response.ok || !response.body) throw new Error('Local preview response is not ready.');
    if (contentType && !response.headers.get('content-type')?.startsWith(contentType)) throw new Error('Local preview asset has the wrong content type.');
    const chunks = []; let size = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > limit) throw new Error('Local preview response exceeded the readiness limit.');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    return Buffer.concat(chunks).toString('utf8');
  }
  while (Date.now() < deadline) {
    try {
      const assets = new Set();
      // Metadata routes compile separately. A working home does not prove its
      // browser icon route has usable manifests, so warm and verify it as well.
      const icon = await read('/icon.svg', 64 * 1024, 'image/svg+xml');
      if (!/<svg[\s>]/.test(icon)) throw new Error('Local preview icon is not ready.');
      for (const path of paths) {
        const body = await read(path, 2 * 1024 * 1024);
        if (path.endsWith('/data')) {
          if (JSON.parse(body).sampleOnly !== true) throw new Error('Unexpected preview data.');
          continue;
        }
        for (const [, source] of body.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
          const asset = new URL(source.replaceAll('&amp;', '&'), origin);
          if (asset.origin !== origin.origin || !asset.pathname.startsWith('/_next/static/') || !asset.pathname.endsWith('.js') || asset.username || asset.password) throw new Error('Unexpected preview asset.');
          assets.add(asset.pathname + asset.search);
        }
      }
      if (!assets.size || assets.size > 24) throw new Error('Local preview scripts are not ready.');
      const previous = new Map();
      for (let pass = 0; pass < 2; pass++) {
        for (const path of assets) {
          const source = await read(path, 8 * 1024 * 1024);
          new Script(source, { filename: path });
          const hash = createHash('sha256').update(source).digest('hex');
          if (pass && previous.get(path) !== hash) throw new Error('Local preview compilation is still changing.');
          previous.set(path, hash);
        }
        if (!pass) await setTimeout(200);
      }
      return { scripts: assets.size };
    } catch {
      if (Date.now() >= deadline) break;
      await setTimeout(300);
    }
  }
  throw new Error('Local preview did not finish compiling. Inspect paynship-dh2-sample-preview.service logs and re-run npm start app.');
}
