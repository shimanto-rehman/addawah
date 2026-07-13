'use client';

import { useState } from 'react';

type TruthImageProps = {
  src: string;
  alt: string;
  /** extra class, e.g. "dawa-truth-media--fill" for full-bleed gradient-wrap backgrounds */
  className?: string;
};

/** Local truth imagery from /public/assets/images/truth, with themed fallback on error. */
export function TruthImage({ src, alt, className = '' }: TruthImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`dawa-truth-media${failed ? ' is-fallback' : ''}${className ? ` ${className}` : ''}`}>
      {!failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <span className="dawa-truth-media__veil" aria-hidden />
      <span className="dawa-truth-media__ring" aria-hidden />
    </div>
  );
}
