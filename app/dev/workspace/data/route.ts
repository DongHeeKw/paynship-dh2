import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { applyWorkspaceAction, getWorkspace, workspaceActionSchema, WorkspaceError } from '@/features/workspace/core/service';
import { developerWorkspaceAllowed, readWorkspaceBody, workspaceMutationOriginAllowed, WorkspaceBoundaryError } from '@/features/workspace/boundary/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const customerIdSchema = z.enum(['sample-customer-cn', 'sample-customer-jp', 'sample-customer-us']).optional();
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
const unavailable = () => NextResponse.json({ error: 'Not found.' }, { status: 404, headers });

function workspaceError(error: unknown) {
  if (error instanceof WorkspaceBoundaryError || error instanceof WorkspaceError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers });
  }
  if (error instanceof ZodError) return NextResponse.json({ error: 'Check the workspace action fields.' }, { status: 400, headers });
  return NextResponse.json({ error: 'The sample workspace is temporarily unavailable.' }, { status: 503, headers });
}

export async function GET(request: Request) {
  if (!developerWorkspaceAllowed(request.headers)) return unavailable();
  try {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(key => key !== 'customerId') || params.getAll('customerId').length > 1) {
      throw new WorkspaceBoundaryError(400, 'Choose one sample customer.');
    }
    const customerId = customerIdSchema.parse(params.get('customerId') ?? undefined);
    return NextResponse.json(await getWorkspace(customerId), { headers });
  } catch (error) { return workspaceError(error); }
}

export async function POST(request: Request) {
  if (!developerWorkspaceAllowed(request.headers)) return unavailable();
  if (!workspaceMutationOriginAllowed(request)) return NextResponse.json({ error: 'Workspace origin is not allowed.' }, { status: 403, headers });
  try {
    if (new URL(request.url).search) throw new WorkspaceBoundaryError(400, 'Send workspace action fields in JSON.');
    const action = workspaceActionSchema.parse(await readWorkspaceBody(request));
    return NextResponse.json(await applyWorkspaceAction(action), { headers });
  } catch (error) { return workspaceError(error); }
}
