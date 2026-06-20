import type { MoodVariant } from '@/lib/moods';

type MoodIconProps = {
  variant: MoodVariant;
  color: string;
  size?: number;
  className?: string;
};

/** Minimal circular line-art face — green (positive) → red (negative). */
export function MoodIcon({ variant, color, size = 48, className = '' }: MoodIconProps) {
  const sw = 2.2;
  const dot = (cx: number, cy: number, r = 2.4) => (
    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
  );

  const eyes = (y = 19) => (
    <>
      {dot(17, y)}
      {dot(31, y)}
    </>
  );

  const heartEye = (cx: number, cy: number) => (
    <path
      key={`h-${cx}`}
      d={`M${cx} ${cy + 2.5} C${cx - 3.5} ${cy - 1.5} ${cx - 5} ${cy + 1} ${cx} ${cy + 5.5} C${cx + 5} ${cy + 1} ${cx + 3.5} ${cy - 1.5} ${cx} ${cy + 2.5} Z`}
      fill={color}
    />
  );

  const mouth = () => {
    switch (variant) {
      case 'ecstatic':
        return (
          <>
            {heartEye(17, 17)}
            {heartEye(31, 17)}
            <path
              d="M13 27 C13 34 39 34 39 27 Z"
              fill={color}
            />
          </>
        );
      case 'happy':
        return (
          <>
            {eyes()}
            <path d="M13 27 C13 34 39 34 39 27 Z" fill={color} />
          </>
        );
      case 'good':
        return (
          <>
            {eyes()}
            <path
              d="M15 27 Q24 34 33 27"
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          </>
        );
      case 'neutral':
        return (
          <>
            {eyes()}
            <line
              x1={15}
              y1={29}
              x2={33}
              y2={29}
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          </>
        );
      case 'sad':
        return (
          <>
            {eyes()}
            <path
              d="M16 30 Q24 26 32 30"
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          </>
        );
      case 'angry':
        return (
          <>
            {eyes(20)}
            <line x1={13} y1={16} x2={20} y2={19} stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <line x1={35} y1={16} x2={28} y2={19} stroke={color} strokeWidth={sw} strokeLinecap="round" />
            <path
              d="M14 33 Q24 26 34 33"
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="round"
            />
          </>
        );
      default:
        return eyes();
    }
  };

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <circle
        cx={24}
        cy={24}
        r={21}
        fill="none"
        stroke={color}
        strokeWidth={sw}
      />
      {mouth()}
    </svg>
  );
}
