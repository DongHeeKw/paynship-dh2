import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

export function sampleEncryption(keyPath, databaseExists) {
  if (!existsSync(keyPath)) {
    if (databaseExists) throw new Error('The existing developer sample database requires its original local encryption key.');
    try { writeFileSync(keyPath, randomBytes(32).toString('hex') + '\n', { flag: 'wx', mode: 0o600 }); }
    catch (error) { if (error?.code !== 'EEXIST') throw error; }
  }
  const text = readFileSync(keyPath, 'utf8').trim();
  if (!/^[a-f0-9]{64}$/i.test(text)) throw new Error('Invalid developer sample encryption key.');
  chmodSync(keyPath, 0o600);
  const key = Buffer.from(text, 'hex');
  return {
    encrypt(value, context) {
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(context));
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
      return ['sample-v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':');
    },
    decrypt(value, context) {
      const [version, iv, tag, body, extra] = value.split(':');
      if (version !== 'sample-v1' || !iv || !tag || !body || extra) throw new Error('Invalid encrypted sample data.');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
      decipher.setAAD(Buffer.from(context));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8'));
    },
  };
}
