import { randomUUID } from 'node:crypto';
import { encryptPii, decryptPii } from './pii';

export function purchaseEventFields(requestId: string, actorId: string, source: string, status: string, message: string) {
  const id = randomUUID();
  return { id, actorId, source, status, message: encryptPii(message, `event:${requestId}:${id}`) };
}

export function purchaseEventMessage(requestId: string, event: { id: string; message: string }) {
  return decryptPii<string>(event.message, `event:${requestId}:${event.id}`);
}
