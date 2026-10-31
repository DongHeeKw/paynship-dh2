import type { User } from '@supabase/supabase-js';
import { prisma } from '@/lib/db/prisma';
import { decryptPii, encryptPii } from './pii';
import { buildStoredDeliveryProfile, readStoredDeliveryProfile } from '@/lib/customs/delivery';
import { consumeQuota } from './quota';
import { purchaseTransaction } from './transaction';

export async function getDeliveryProfile(userId: string) {
  const row = await prisma.deliveryProfile.findUnique({ where: { userId } });
  return row ? readStoredDeliveryProfile(decryptPii(row.encryptedData, `profile:${userId}`)) : null;
}

export async function saveDeliveryProfile(user: User, input: unknown) {
  const profile = buildStoredDeliveryProfile(input);
  const encryptedData = encryptPii(profile, `profile:${user.id}`);
  await purchaseTransaction(async tx => {
    await consumeQuota(tx, `profile:${user.id}`, 20);
    await tx.user.upsert({ where: { id: user.id }, create: { id: user.id, email: user.email! }, update: { email: user.email! } });
    await tx.deliveryProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, encryptedData }, update: { encryptedData } });
  });
  return profile;
}
