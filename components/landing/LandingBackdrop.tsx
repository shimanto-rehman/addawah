'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LANDING_BACKDROP_READY_EVENT,
  LANDING_HERO_SRC,
  LANDING_VIDEO_MOBILE_MP4_SRC,
  LANDING_VIDEO_MOBILE_SRC,
  LANDING_VIDEO_MP4_SRC,
  LANDING_VIDEO_SRC,
} from '@/lib/constants';

const MOBILE_VIDEO_MQ = '(max-width: 768px)';
const PLAY_RETRY_MS = 400;
const PLAY_TIMEOUT_MS = 18000;

function pickSources(isMobile: boolean) {
  return isMobile
    ? { webm: LANDING_VIDEO_MOBILE_SRC, mp4: LANDING_VIDEO_MOBILE_MP4_SRC }
    : { webm: LANDING_VIDEO_SRC, mp4: LANDING_VIDEO_MP4_SRC };
}

function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_VIDEO_MQ).matches;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function LandingBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readySent = useRef(false);
  const [sources, setSources] = useState(() => pickSources(isMobileViewport()));
  const [useFallback, setUseFallback] = useState(() => prefersReducedMotion());

  const signalReady = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    window.dispatchEvent(new CustomEvent(LANDING_BACKDROP_READY_EVENT));
  }, []);

  const tryPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || useFallback) return false;

    try {
      if (video.paused) await video.play();
      return !video.paused;
    } catch {
      return false;
    }
  }, [useFallback]);

  useEffect(() => {
    if (!useFallback) return;

    const img = new Image();
    img.onload = () => signalReady();
    img.onerror = () => signalReady();
    img.src = LANDING_HERO_SRC;
  }, [useFallback, signalReady]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_VIDEO_MQ);
    const update = () => setSources(pickSources(mq.matches));
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || useFallback) return;

    video.load();

    const onPlaying = () => signalReady();
    const onReady = () => void tryPlay();
    const onError = () => setUseFallback(true);

    video.addEventListener('playing', onPlaying);
    video.addEventListener('canplay', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void tryPlay();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onReady);

    const retryId = window.setInterval(() => {
      if (readySent.current) return;
      void tryPlay();
    }, PLAY_RETRY_MS);

    const timeoutId = window.setTimeout(() => {
      if (readySent.current) return;
      setUseFallback(true);
    }, PLAY_TIMEOUT_MS);

    void tryPlay();

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onReady);
      window.clearInterval(retryId);
      window.clearTimeout(timeoutId);
    };
  }, [sources, tryPlay, useFallback, signalReady]);

  return (
    <div
      className={`dawa-landing-backdrop${useFallback ? ' is-fallback' : ''}`}
      aria-hidden="true"
      style={useFallback ? { backgroundImage: `url('${LANDING_HERO_SRC}')` } : undefined}
    >
      {!useFallback && (
        <video
          ref={videoRef}
          className="dawa-landing-backdrop__video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={LANDING_HERO_SRC}
        >
          <source src={sources.webm} type="video/webm" />
          <source src={sources.mp4} type="video/mp4" />
        </video>
      )}
      <div className="dawa-landing-backdrop__scrim" />
    </div>
  );
}
