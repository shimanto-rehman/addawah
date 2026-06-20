'use client';

import Script from 'next/script';
import { CONFETTI_SCRIPT_SRC } from '@/lib/constants';

export function ConfettiScript() {
  return <Script src={CONFETTI_SCRIPT_SRC} strategy="afterInteractive" />;
}
