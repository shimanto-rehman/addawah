'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import Preloader from '@/components/preloader/addawah-Preloader';
import { LANDING_BACKDROP_READY_EVENT } from '@/lib/constants';

const APP_ROUTE_PREFIXES = ['/dashboard', '/profile', '/friends', '/analytics', '/settings', '/u', '/ruhaniah', '/in'];

function isAppRoute(pathname: string) {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isLandingRoute(pathname: string) {
  return pathname === '/';
}

export function PreloaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const authReadyRef = useRef(!isAppRoute(pathname));
  const [showPreloader, setShowPreloader] = useState(true);
  const [resourcesReady, setResourcesReady] = useState(false);
  const [authReady, setAuthReady] = useState(authReadyRef.current);
  const [landingBackdropReady, setLandingBackdropReady] = useState(!isLandingRoute(pathname));

  const onAppAuthReady = useCallback(() => {
    authReadyRef.current = true;
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!isAppRoute(pathname)) {
      authReadyRef.current = true;
      setAuthReady(true);
      return;
    }

    if (authReadyRef.current) return;

    window.addEventListener('appAuthReady', onAppAuthReady);
    return () => window.removeEventListener('appAuthReady', onAppAuthReady);
  }, [pathname, onAppAuthReady]);

  useEffect(() => {
    if (!isLandingRoute(pathname)) {
      setLandingBackdropReady(true);
      return;
    }

    setLandingBackdropReady(false);

    const onBackdropReady = () => setLandingBackdropReady(true);
    window.addEventListener(LANDING_BACKDROP_READY_EVENT, onBackdropReady);

    return () => {
      window.removeEventListener(LANDING_BACKDROP_READY_EVENT, onBackdropReady);
    };
  }, [pathname]);

  const dismiss = resourcesReady && authReady && landingBackdropReady;

  return (
    <>
      {showPreloader && (
        <Preloader
          onResourcesReady={() => setResourcesReady(true)}
          dismiss={dismiss}
          onDismissComplete={() => setShowPreloader(false)}
        />
      )}
      {children}
    </>
  );
}
