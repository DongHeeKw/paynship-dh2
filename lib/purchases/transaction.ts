import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { PurchaseError } from './errors';

export async function purchaseTransaction<T>(action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(action, { isolationLevel: 'Serializable', timeout: 10000 }); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2034', 'P2002'].includes(error.code)) throw error;
    }
  }
  throw new PurchaseError(409, 'Another update is in progress. Refresh and try again.');
}
