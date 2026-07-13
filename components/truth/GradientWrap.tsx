'use client';

import type { ReactNode } from 'react';
import { useGradientExpand } from './useGradientExpand';

type GradientWrapProps = {
  id?: string;
  className?: string;
  boxClassName?: string;
  baseMaxWidth?: number;
  baseRadius?: number;
  children: ReactNode;
};

/**
 * Full-width "gradient-wrap" section (hero-gradient-wrap / team-gradient-wrap /
 * pricing-gradient-wrap equivalent): a capped-width wrap containing a rounded
 * box that expands toward 100vw — and loses its border-radius — as it scrolls
 * up through the viewport. See useGradientExpand for the scroll math.
 */
export function GradientWrap({
  id,
  className = '',
  boxClassName = '',
  baseMaxWidth = 1152,
  baseRadius = 28,
  children,
}: GradientWrapProps) {
  const { wrapRef, boxRef } = useGradientExpand(baseMaxWidth, baseRadius);

  return (
    <div id={id} ref={wrapRef} className={`dawa-truth-gradient-wrap ${className}`.trim()}>
      <div ref={boxRef} className={`dawa-truth-gradient-box ${boxClassName}`.trim()}>
        {children}
      </div>
    </div>
  );
}
