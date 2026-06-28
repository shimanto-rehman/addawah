import type { Metadata } from 'next';
import { DEVELOPER, SITE_LOGO_SRC, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/constants';

export const SITE_DESCRIPTION =
  'Addawah is a free Islamic web app for Salah tracking, wakt accountability, Hijri calendar, daily Qur\'an and hadith inspiration, brotherhood reminders, and worship analytics — built for the ummah with no ads.';

export const SITE_DESCRIPTION_SHORT =
  'Free Islamic Salah tracker, prayer accountability, and community app for Muslims worldwide.';

export const SEO_KEYWORDS = [
  'salah tracker',
  'prayer tracker',
  'muslim prayer app',
  'islamic prayer tracker',
  'fard salah tracker',
  'wakt tracker',
  'prayer times tracker',
  'hijri calendar',
  'islamic accountability app',
  'muslim community app',
  'prayer streak app',
  'sunnah tracker',
  'worship analytics',
  'islamic lifestyle app',
  'free muslim app',
  'ummah',
  'addawah',
] as const;

const OG_IMAGE = '/assets/images/landing.webp';
const OG_IMAGE_ALT =
  'Addawah — Islamic Salah tracker and prayer accountability app with mihrab-inspired design';

function absoluteUrl(path: string) {
  const base = SITE_URL.replace(/\/$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const METADATA_BASE = new URL(SITE_URL);

export const rootMetadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [...SEO_KEYWORDS],
  applicationName: SITE_NAME,
  authors: [{ name: DEVELOPER.name, url: DEVELOPER.portfolioUrl }],
  creator: DEVELOPER.name,
  publisher: SITE_NAME,
  category: 'Islamic lifestyle',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION_SHORT,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: OG_IMAGE_ALT,
        type: 'image/webp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION_SHORT,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [{ url: SITE_LOGO_SRC, type: 'image/webp' }],
    apple: [{ url: SITE_LOGO_SRC, type: 'image/webp' }],
  },
  manifest: '/manifest.webmanifest',
  other: {
    'apple-mobile-web-app-title': SITE_NAME,
    'mobile-web-app-capable': 'yes',
  },
};

export const privateAppMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const canonical = path.startsWith('/') ? path : `/${path}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [{ url: OG_IMAGE, alt: OG_IMAGE_ALT }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [OG_IMAGE],
    },
    ...(noIndex
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

export const homeMetadata: Metadata = {
  ...pageMetadata({
    title: `${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    path: '/',
  }),
  title: {
    absolute: `${SITE_NAME} — ${SITE_TAGLINE}`,
  },
};

export const loginMetadata = pageMetadata({
  title: 'Sign In',
  description:
    'Sign in to Addawah to track your five daily prayers, connect with brothers and sisters, and grow your worship consistency.',
  path: '/login',
});

export const resetPasswordMetadata = pageMetadata({
  title: 'Reset Password',
  description: 'Securely reset your Addawah account password with email verification.',
  path: '/reset-password',
  noIndex: true,
});

export const setPasswordMetadata = pageMetadata({
  title: 'Set New Password',
  description: 'Choose a new password for your Addawah account.',
  path: '/reset-password/set',
  noIndex: true,
});

export function organizationJsonLd() {
  return {
    '@type': 'Organization',
    '@id': `${absoluteUrl('/')}#organization`,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl(SITE_LOGO_SRC),
    description: SITE_DESCRIPTION_SHORT,
    founder: {
      '@type': 'Person',
      name: DEVELOPER.name,
      url: DEVELOPER.portfolioUrl,
    },
  };
}

export function webSiteJsonLd() {
  return {
    '@type': 'WebSite',
    '@id': `${absoluteUrl('/')}#website`,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION_SHORT,
    publisher: { '@id': `${absoluteUrl('/')}#organization` },
    inLanguage: 'en',
  };
}

export function softwareApplicationJsonLd() {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${absoluteUrl('/')}#app`,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: SITE_DESCRIPTION,
    image: absoluteUrl(OG_IMAGE),
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    featureList: [
      'Weekly Salah tracker for five daily prayers',
      'Sunnah and fard prayer logging',
      'Wakt board and prayer accountability with friends',
      'Hijri and Gregorian calendar',
      'Daily Qur\'an and hadith inspiration',
      'Worship analytics and iman insights',
      'Gold rewards and badge progression',
      'Dark and light sacred color themes',
    ],
  };
}

export function webPageJsonLd({
  path = '/',
  name,
  description,
}: {
  path?: string;
  name: string;
  description: string;
}) {
  const url = absoluteUrl(path);
  return {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: { '@id': `${absoluteUrl('/')}#website` },
    about: { '@id': `${absoluteUrl('/')}#app` },
    inLanguage: 'en',
  };
}

export function homeJsonLdGraph() {
  return [organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd(), webPageJsonLd({
    path: '/',
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  })];
}

export const PUBLIC_ROUTES = [
  { path: '/', changeFrequency: 'weekly' as const, priority: 1 },
  { path: '/login', changeFrequency: 'monthly' as const, priority: 0.8 },
];

export const ROBOTS_DISALLOW = [
  '/dashboard',
  '/friends',
  '/analytics',
  '/settings',
  '/profile',
  '/notifications',
  '/u/',
  '/api/',
  '/reset-password',
];
