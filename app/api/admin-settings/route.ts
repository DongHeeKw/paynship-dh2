import { NextResponse } from 'next/server';
import { requireAdminForApi } from '@/lib/api/auth-middleware';
import { getOperationalSettings } from '@/lib/admin/operational-settings';
import { readOperationalSettings, saveOperationalSettings } from '@/lib/admin/operational-settings-store';
import { readPurchaseBody, purchaseApiError } from '@/lib/purchases/api';

export async function GET() {
  try {
    const auth = await requireAdminForApi(); if (auth.error) return auth.error;
    return NextResponse.json({ ...getOperationalSettings(await readOperationalSettings()), adminRole: auth.adminRole });
  } catch (error) { return purchaseApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdminForApi({ minimumRole: 'super_admin' }); if (auth.error) return auth.error;
    const row = await saveOperationalSettings(auth.user!.id, await readPurchaseBody(request));
    return NextResponse.json({ ...getOperationalSettings(row), adminRole: auth.adminRole });
  } catch (error) { return purchaseApiError(error); }
}
