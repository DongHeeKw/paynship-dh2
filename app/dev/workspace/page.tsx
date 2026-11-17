import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import DeveloperWorkspace from '@/features/workspace/ui/DeveloperWorkspace';
import { developerWorkspaceAllowed } from '@/features/workspace/boundary/access';

export const dynamic = 'force-dynamic';

export default async function DeveloperWorkspacePage() {
  if (!developerWorkspaceAllowed(await headers())) notFound();
  return <DeveloperWorkspace />;
}
