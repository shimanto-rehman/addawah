'use client';

export function IslamicBackdrop() {
  return (
    <div className="dawa-backdrop" aria-hidden="true">
      <div className="dawa-backdrop__gradient" />
      <svg className="dawa-backdrop__stars" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dawa-stars" width="80" height="80" patternUnits="userSpaceOnUse">
            <path
              d="M40 4 L44 28 L68 28 L48 42 L56 66 L40 52 L24 66 L32 42 L12 28 L36 28 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              opacity="0.35"
            />
            <circle cx="40" cy="40" r="2" fill="currentColor" opacity="0.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dawa-stars)" />
      </svg>
      <div className="dawa-backdrop__arch-glow" />
    </div>
  );
}
