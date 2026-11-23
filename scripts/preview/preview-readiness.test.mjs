import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { warmPreviewServer } from './preview-readiness.mjs';

test('preview readiness refuses non-loopback origins before any request', async () => {
  for (const origin of ['http://example.com', 'https://127.0.0.1', 'http://user:pass@localhost', 'http://localhost/path']) {
    await assert.rejects(warmPreviewServer(origin), /loopback/);
  }
});

test('preview readiness retries a truncated first-compile chunk and requires stable complete scripts', async () => {
  let scriptRequests = 0;
  const pages = new Set();
  const server = createServer((request, response) => {
    if (request.url === '/_next/static/preview.js') {
      scriptRequests++;
      // A partial dev chunk can have HTTP 200 and still prevent hydration.
      response.end(scriptRequests === 1 ? 'const fixture = "incomplete' : 'const fixture = "complete";');
    } else if (request.url === '/dev/workspace/data') {
      pages.add(request.url); response.end('{"sampleOnly":true}');
    } else if (request.url === '/icon.svg') {
      pages.add(request.url); response.setHeader('Content-Type', 'image/svg+xml'); response.end('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    } else {
      pages.add(request.url); response.end('<html><script src="/_next/static/preview.js"></script></html>');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await warmPreviewServer(`http://127.0.0.1:${server.address().port}`, { timeoutMs: 5000 });
    assert.equal(result.scripts, 1); assert.equal(scriptRequests, 3);
    assert.deepEqual([...pages].sort(), ['/', '/dev/preview', '/dev/workspace', '/dev/workspace/data', '/icon.svg', '/products']);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('preview is not ready while the metadata icon returns a manifest error', async () => {
  let iconRequests = 0;
  const server = createServer((request, response) => {
    if (request.url === '/icon.svg') {
      iconRequests++;
      response.statusCode = iconRequests === 1 ? 500 : 200;
      response.setHeader('Content-Type', iconRequests === 1 ? 'text/html' : 'image/svg+xml');
      response.end(iconRequests === 1 ? "Cannot read properties of undefined (reading '/_app')" : '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    } else if (request.url === '/_next/static/preview.js') response.end('const ready = true;');
    else if (request.url === '/dev/workspace/data') response.end('{"sampleOnly":true}');
    else response.end('<html><script src="/_next/static/preview.js"></script></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await warmPreviewServer(`http://127.0.0.1:${server.address().port}`, { timeoutMs: 5000 });
    assert.ok(iconRequests >= 2, 'must retry the icon before advertising the app');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
