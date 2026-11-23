import type { Metadata } from 'next';
import SiteShell from '@/components/site/SiteShell';
import HowItWorksGuide from '@/components/guides/HowItWorksGuide';

export const metadata: Metadata = {
  title: 'How It Works | PayNShip',
  description: 'Your PayNShip guide to buying, costs, shipping, customs, returns and support.',
};
export default function GuidePage() {
  return <SiteShell><HowItWorksGuide /></SiteShell>;
}
