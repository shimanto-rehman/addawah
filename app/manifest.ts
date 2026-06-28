import type { MetadataRoute } from 'next';
import { SITE_LOGO_SRC, SITE_NAME } from '@/lib/constants';
import { METADATA_BASE, SITE_DESCRIPTION_SHORT } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION_SHORT,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050608',
    theme_color: '#c9a227',
    orientation: 'portrait-primary',
    lang: 'en',
    dir: 'ltr',
    categories: ['lifestyle', 'productivity'],
    icons: [
      {
        src: SITE_LOGO_SRC,
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'any',
      },
      {
        src: SITE_LOGO_SRC,
        sizes: '512x512',
        type: 'image/webp',
        purpose: 'maskable',
      },
    ],
    id: METADATA_BASE.origin,
  };
}
