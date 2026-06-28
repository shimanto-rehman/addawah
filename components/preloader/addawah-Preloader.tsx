'use client';

import { useEffect, useState } from 'react';
import { ADDAWAH_PRELOADER_SLIDES, ADDAWAH_PRELOADER_SVGS } from './addawah-preloaderData';
import './addawah-Preloader.css';

const PRELOADER_INNER_HTML = `<div class="center">
  <div class="dawa-greeting-carousel" id="dawaGreetingCarousel">
${ADDAWAH_PRELOADER_SLIDES.map(
  (slide) => `    <div
      class="dawa-greeting-slide"
      role="img"
      aria-label="${slide.label}"
    >
      ${ADDAWAH_PRELOADER_SVGS[slide.key]}
    </div>`,
).join('\n')}
  </div>
</div>`;

const EXIT_MS = 200;
const CAROUSEL_MS = 350;
const FADE_OUT_MS = 800;
const RESOURCE_SETTLE_MS = 1500;

type PreloaderProps = {
  /** Fired once images, fonts, and page load have settled */
  onResourcesReady?: () => void;
  /** When true, begins fade-out (parent gates this on app readiness) */
  dismiss?: boolean;
  /** Fired after fade-out animation completes — safe to unmount */
  onDismissComplete?: () => void;
};

export default function Preloader({
  onResourcesReady,
  dismiss = false,
  onDismissComplete,
}: PreloaderProps) {
  const [resourcesReady, setResourcesReady] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let carouselIntervalId = 0;
    let carouselExitTimerId = 0;

    const reducedMotion = () =>
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    function nextFrame(cb: () => void) {
      requestAnimationFrame(() => requestAnimationFrame(cb));
    }

    function initGreetingCarousel() {
      const wrap = document.getElementById('dawaGreetingCarousel');
      if (!wrap) return;

      const slides = Array.from(wrap.querySelectorAll<HTMLElement>('.dawa-greeting-slide'));
      if (!slides.length) return;

      let current: HTMLElement | undefined = slides[0];
      let idx = 1;

      function activate(el: HTMLElement) {
        el.classList.remove('exit');
        el.classList.add('active');
      }

      function showFirst() {
        slides.forEach((s) => s.classList.remove('active', 'exit'));
        current = slides[0];
        idx = 1;
        nextFrame(() => current && activate(current));
      }

      function showNext() {
        if (cancelled) return;
        const nextIdx = idx % slides.length;
        const next = slides[nextIdx];

        if (current) {
          window.clearTimeout(carouselExitTimerId);
          current.classList.remove('active');
          current.classList.add('exit');
          const dying = current;
          carouselExitTimerId = window.setTimeout(() => dying.classList.remove('exit'), EXIT_MS);
        }

        current = next;
        if (current) activate(current);
        idx++;
      }

      if (reducedMotion()) {
        slides.forEach((s, i) => {
          s.classList.remove('exit');
          s.classList.toggle('active', i === 0);
        });
        return;
      }

      showFirst();
      carouselIntervalId = window.setInterval(showNext, CAROUSEL_MS);

      window.addEventListener(
        'pagehide',
        () => {
          window.clearInterval(carouselIntervalId);
          carouselIntervalId = 0;
        },
        { once: true },
      );
    }

    const allResourcesLoaded = (): Promise<void> => {
      const images = Array.from(document.images).filter((img) => img.getAttribute('loading') !== 'lazy');
      const allImagesLoaded = images.every((img) => img.complete);
      const fontsLoaded = document.fonts ? document.fonts.ready : Promise.resolve();
      const imagesPromise = allImagesLoaded
        ? Promise.resolve()
        : Promise.all(
            images.map(
              (img) =>
                new Promise<void>((resolve) => {
                  if (img.complete) resolve();
                  else img.onload = img.onerror = () => resolve();
                }),
            ),
          );
      return Promise.all([imagesPromise, fontsLoaded]).then(() => {});
    };

    const checkPageLoad = () => {
      const handleComplete = () => {
        if (cancelled) return;
        window.setTimeout(() => {
          if (cancelled) return;
          setResourcesReady(true);
          onResourcesReady?.();
        }, RESOURCE_SETTLE_MS);
      };

      if (document.readyState === 'complete') {
        allResourcesLoaded().then(handleComplete);
      } else {
        window.addEventListener(
          'load',
          () => {
            allResourcesLoaded().then(handleComplete);
          },
          { once: true },
        );
      }
    };

    queueMicrotask(() => {
      if (!cancelled) initGreetingCarousel();
    });
    checkPageLoad();

    return () => {
      cancelled = true;
      if (carouselIntervalId) window.clearInterval(carouselIntervalId);
      if (carouselExitTimerId) window.clearTimeout(carouselExitTimerId);
    };
  }, [onResourcesReady]);

  useEffect(() => {
    if (resourcesReady && dismiss && !fadeOut) {
      setFadeOut(true);
      const id = window.setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('preloaderComplete'));
        }
        onDismissComplete?.();
      }, FADE_OUT_MS);
      return () => window.clearTimeout(id);
    }
  }, [resourcesReady, dismiss, fadeOut, onDismissComplete]);

  return (
    <div className={`dawa-preloader-root ${fadeOut ? 'fade-out' : ''}`}>
      <div className="dawa-preloader-shell" dangerouslySetInnerHTML={{ __html: PRELOADER_INNER_HTML }} />
    </div>
  );
}
