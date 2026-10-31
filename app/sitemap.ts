import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site/url';

const appUrl = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: appUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];
}
