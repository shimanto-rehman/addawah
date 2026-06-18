'use client';

import { useState } from 'react';
import Preloader from '@/components/proloader/addawah-Preloader';

export function PreloaderGate({ children }: { children: React.ReactNode }) {
  const [showPreloader, setShowPreloader] = useState(true);

  return (
    <>
      {showPreloader && <Preloader onLoadComplete={() => setShowPreloader(false)} />}
      {children}
    </>
  );
}
