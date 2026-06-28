'use client';

import { LandingBackdrop } from '@/components/landing/LandingBackdrop';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LandingBackdrop />
      {children}
    </>
  );
}
