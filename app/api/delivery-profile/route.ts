import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { purchaseUser } from '@/lib/purchases/auth';
import { getDeliveryProfile, saveDeliveryProfile } from '@/lib/purchases/profile';
import { purchaseApiError, readPurchaseBody } from '@/lib/purchases/api';
export const runtime = 'nodejs';
export async function GET() {
  try { const user = await purchaseUser(); return NextResponse.json({ profile: await getDeliveryProfile(user.id) }); }
  catch (error) { return purchaseApiError(error); }
}
export async function PUT(request: Request) {
  try { const user = await purchaseUser(); return NextResponse.json({ profile: await saveDeliveryProfile(user, await readPurchaseBody(request)) }); }
  catch (error) { return purchaseApiError(error); }
}
export async function DELETE() {
  try { const user = await purchaseUser(); await prisma.deliveryProfile.deleteMany({ where: { userId: user.id } }); return NextResponse.json({ ok: true }); }
  catch (error) { return purchaseApiError(error); }
}
