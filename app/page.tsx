import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import HomeExperience from '@/components/home/HomeExperience';

export const metadata: Metadata = { title: 'PayNShip — From Korea to your door', description: 'Submit a Korean product link, review your quote, and follow your delivery.' };

export default function Home() {
  return <SiteShell variant="home">
    <HomeExperience />
  </SiteShell>;
}
