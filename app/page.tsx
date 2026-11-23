import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import HomeExperience from '@/components/home/HomeExperience';

export const metadata: Metadata = { title: 'PayNShip — From Korea to your door.', description: 'Start with a Korean product link, discover more finds, and follow your orders in one place.' };

export default function Home() {
  return <SiteShell variant="home">
    <HomeExperience />
  </SiteShell>;
}
