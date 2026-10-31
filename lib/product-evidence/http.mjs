import https from 'node:https';
import { createHash } from 'node:crypto';
import { pinnedAddress } from './network-policy.mjs';

export const USER_AGENT = 'PayNShipEvidence/1.0';
export const MAX_BYTES = 2 * 1024 * 1024;

/** Resolve once per request and pin the socket to a public IP, while retaining TLS hostname checks. */
export async function fetchPublicPage(url) {
  const address = await pinnedAddress(url.hostname);
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'GET', agent: false, servername: url.hostname,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain;q=0.9', 'Accept-Encoding': 'identity' },
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
    }, response => {
      const chunks = [];
      let bytes = 0;
      if (Number(response.headers['content-length'] ?? 0) > MAX_BYTES ||
          (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
        response.destroy(new Error('response_size_or_encoding_not_supported'));
      }
      response.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) { response.destroy(new Error('response_too_large')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({
        status: response.statusCode ?? 0, contentType: String(response.headers['content-type'] ?? ''),
        location: response.headers.location, body: Buffer.concat(chunks).toString('utf8'), bytes,
        sha256: createHash('sha256').update(Buffer.concat(chunks)).digest('hex'),
      }));
    });
    const timer = setTimeout(() => request.destroy(new Error('request_timeout')), 8000);
    request.on('close', () => clearTimeout(timer));
    request.on('error', reject);
    request.end();
  });
}
