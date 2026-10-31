import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export { productUrl } from './product-url.mjs';

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (family === 6) {
    // URL parsing canonicalizes equivalent IPv6 spellings, including leading zero hextets.
    let normalized;
    try { normalized = new URL('http://[' + address + ']/').hostname.slice(1, -1); } catch { return false; }
    const [firstPart, secondPart] = normalized.split(':');
    const first = Number.parseInt(firstPart, 16);
    const second = secondPart ? Number.parseInt(secondPart, 16) : 0;
    // Conservatively exclude the IETF special-purpose /23, documentation,
    // and transition prefixes; this collector does not need their exceptions.
    // https://www.iana.org/assignments/iana-ipv6-special-registry/
    return /^[23][0-9a-f]{3}:/.test(normalized) &&
      !(first === 0x2001 && (second < 0x0200 || second === 0x0db8)) && first !== 0x2002 &&
      !(first === 0x3fff && second < 0x1000);
  }
  return false;
}

export async function pinnedAddress(hostname, resolver = lookup) {
  let timer;
  const records = await Promise.race([
    resolver(hostname, { all: true, verbatim: true }),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('request_timeout')), 8000); }),
  ]).finally(() => clearTimeout(timer));
  if (!records.length || records.some(record => !isPublicAddress(record.address))) throw new Error('unsafe_dns_address');
  return records.find(record => record.family === 4) ?? records[0];
}
