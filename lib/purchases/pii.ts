import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { PurchaseError } from './errors';

function key(): Buffer {
  const value = process.env.PII_ENCRYPTION_KEY ?? '';
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new PurchaseError(503, 'Secure customer data storage is not configured.');
  return Buffer.from(value, 'hex');
}

export function encryptPii(value: unknown, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

export function decryptPii<T>(value: string, context: string): T {
  const [version, iv, tag, data] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new PurchaseError(503, 'Customer data could not be read.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')) as T;
}
