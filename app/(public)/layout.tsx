import { PublicShell } from '@/components/landing/PublicShell';
import {
  LANDING_HERO_SRC,
  LANDING_VIDEO_MOBILE_MP4_SRC,
  LANDING_VIDEO_MP4_SRC,
} from '@/lib/constants';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" as="image" href={LANDING_HERO_SRC} fetchPriority="high" />
      <link
        rel="preload"
        as="video"
        href={LANDING_VIDEO_MOBILE_MP4_SRC}
        type="video/mp4"
        media="(max-width: 768px)"
      />
      <link
        rel="preload"
        as="video"
        href={LANDING_VIDEO_MP4_SRC}
        type="video/mp4"
        media="(min-width: 769px)"
      />
      <PublicShell>{children}</PublicShell>
    </>
  );
}
