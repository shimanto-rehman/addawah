'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Preloader from '@/components/proloader/addawah-Preloader';

const APP_ROUTE_PREFIXES = ['/dashboard', '/profile', '/friends', '/analytics', '/settings'];

function isAppRoute(pathname: string) {
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function PreloaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showPreloader, setShowPreloader] = useState(true);
  const [resourcesReady, setResourcesReady] = useState(false);
  const [authReady, setAuthReady] = useState(() => !isAppRoute(pathname));

  const onAppAuthReady = useCallback(() => {
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!isAppRoute(pathname)) {
      setAuthReady(true);
      return;
    }

    setAuthReady(false);
    window.addEventListener('appAuthReady', onAppAuthReady);
    return () => window.removeEventListener('appAuthReady', onAppAuthReady);
  }, [pathname, onAppAuthReady]);

  const dismiss = resourcesReady && authReady;

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
