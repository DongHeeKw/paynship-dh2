import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import AccountPanel from '@/components/site/AccountPanel';

export const metadata: Metadata = { title: 'Create an account · PayNShip', description: 'Create your PayNShip account to save delivery details and follow your Korean purchase requests.' };

export default function SignupPage() {
  return <SiteShell variant="coastal"><AccountPanel mode="signup" /></SiteShell>;
}
