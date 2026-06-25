import { LandingPage } from '@/components/landing/LandingPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { LANDING_HERO_SRC } from '@/lib/constants';
import { homeJsonLdGraph, homeMetadata } from '@/lib/seo';

export const metadata = homeMetadata;

export default function HomePage() {
  return (
    <>
      <link rel="preload" as="image" href={LANDING_HERO_SRC} fetchPriority="high" />
      <JsonLd data={homeJsonLdGraph()} />
      <LandingPage />
    </>
  );
}
