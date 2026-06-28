import { LandingPage } from '@/components/landing/LandingPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { homeJsonLdGraph, homeMetadata } from '@/lib/seo';

export const metadata = homeMetadata;

export default function HomePage() {
  return (
    <>
      <JsonLd data={homeJsonLdGraph()} />
      <LandingPage />
    </>
  );
}
