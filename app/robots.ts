import type { MetadataRoute } from 'next';
import { METADATA_BASE, ROBOTS_DISALLOW } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ROBOTS_DISALLOW,
    },
    sitemap: new URL('/sitemap.xml', METADATA_BASE).toString(),
    host: METADATA_BASE.origin,
  };
}
