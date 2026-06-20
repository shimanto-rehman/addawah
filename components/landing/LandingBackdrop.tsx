'use client';

import { useEffect, useState } from 'react';
import { LANDING_HERO_SRC, LANDING_VIDEO_MOBILE_SRC, LANDING_VIDEO_SRC } from '@/lib/constants';

const MOBILE_VIDEO_MQ = '(max-width: 768px)';

export function LandingBackdrop() {
  const [videoSrc, setVideoSrc] = useState(LANDING_VIDEO_SRC);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_VIDEO_MQ);
    const update = () => {
      setVideoSrc(mq.matches ? LANDING_VIDEO_MOBILE_SRC : LANDING_VIDEO_SRC);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <div className="dawa-landing-backdrop" aria-hidden="true">
      <video
        key={videoSrc}
        className="dawa-landing-backdrop__video"
        autoPlay
        muted
        loop
        playsInline
        poster={LANDING_HERO_SRC}
      >
        <source src={videoSrc} type="video/webm" />
      </video>
      <div className="dawa-landing-backdrop__scrim" />
    </div>
  );
}
