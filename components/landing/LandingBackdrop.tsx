'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LANDING_BACKDROP_READY_EVENT,
  LANDING_HERO_SRC,
  LANDING_VIDEO_MOBILE_MP4_SRC,
  LANDING_VIDEO_MP4_SRC,
  LANDING_VIDEO_SRC,
} from '@/lib/constants';

const MOBILE_VIDEO_MQ = '(max-width: 768px)';
const PLAY_RETRY_MS = 400;
const DESKTOP_PLAY_TIMEOUT_MS = 18000;
const MOBILE_PLAY_TIMEOUT_MS = 10000;

type VideoSources = {
  webm: string | null;
  mp4: string;
};

function pickSources(isMobile: boolean): VideoSources {
  return isMobile
    ? { webm: null, mp4: LANDING_VIDEO_MOBILE_MP4_SRC }
    : { webm: LANDING_VIDEO_SRC, mp4: LANDING_VIDEO_MP4_SRC };
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function LandingBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readySent = useRef(false);
  const [sources, setSources] = useState<VideoSources | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [useFallback, setUseFallback] = useState(() => prefersReducedMotion());
  const [videoVisible, setVideoVisible] = useState(false);

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

  /* Resolve viewport on client only — avoids mobile downloading the 7MB desktop file from SSR. */
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_VIDEO_MQ);
    const sync = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setSources(pickSources(mobile));
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* Dismiss preloader once poster is ready — do not wait for full video playback. */
  useEffect(() => {
    if (useFallback) return;

    const poster = new Image();
    poster.onload = () => signalReady();
    poster.onerror = () => signalReady();
    poster.src = LANDING_HERO_SRC;
  }, [useFallback, signalReady]);

  useEffect(() => {
    if (!useFallback) return;

    const img = new Image();
    img.onload = () => signalReady();
    img.onerror = () => signalReady();
    img.src = LANDING_HERO_SRC;
  }, [useFallback, signalReady]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || useFallback || !sources) return;

    video.load();

    const onPlaying = () => setVideoVisible(true);
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

    const retryId = window.setInterval(() => void tryPlay(), PLAY_RETRY_MS);

    const timeoutMs = isMobile ? MOBILE_PLAY_TIMEOUT_MS : DESKTOP_PLAY_TIMEOUT_MS;
    const timeoutId = window.setTimeout(() => {
      if (!videoVisible) setUseFallback(true);
    }, timeoutMs);

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
  }, [sources, isMobile, tryPlay, useFallback, videoVisible]);

  return (
    <div
      className={`dawa-landing-backdrop${useFallback ? ' is-fallback' : ''}${videoVisible ? ' is-video-playing' : ''}`}
      aria-hidden="true"
      style={{
        backgroundImage: `url('${LANDING_HERO_SRC}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {sources && !useFallback && (
        <video
          ref={videoRef}
          className="dawa-landing-backdrop__video"
          autoPlay
          muted
          loop
          playsInline
          preload={isMobile ? 'metadata' : 'auto'}
          poster={LANDING_HERO_SRC}
        >
          <source src={sources.mp4} type="video/mp4" />
          {sources.webm && <source src={sources.webm} type="video/webm" />}
        </video>
      )}
      <div className="dawa-landing-backdrop__scrim" />
    </div>
  );
}
