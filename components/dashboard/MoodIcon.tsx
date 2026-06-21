import type { MoodVariant } from '@/lib/moods';

type MoodIconProps = {
  variant: MoodVariant;
  color: string;
  size?: number;
  className?: string;
};

const CX = 24;
const EYE_Y = 20;
const EYE_L = 18;
const EYE_R = 30;
const SW = 2.15;

/** Minimal circular line-art face — green (positive) → red (negative). */
export function MoodIcon({ variant, color, size = 48, className = '' }: MoodIconProps) {
  const dot = (cx: number, cy: number, r = 2.15) => (
    <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={color} />
  );

  const eyes = () => (
    <>
      {dot(EYE_L, EYE_Y)}
      {dot(EYE_R, EYE_Y)}
    </>
  );

  const heartEye = (cx: number, cy: number) => (
    <path
      key={`h-${cx}`}
      d={`M${cx} ${cy + 2.2} C${cx - 3.2} ${cy - 1.2} ${cx - 4.6} ${cy + 0.8} ${cx} ${cy + 5} C${cx + 4.6} ${cy + 0.8} ${cx + 3.2} ${cy - 1.2} ${cx} ${cy + 2.2} Z`}
      fill={color}
    />
  );

  const mouth = () => {
    switch (variant) {
      case 'ecstatic':
        return (
          <>
            {heartEye(EYE_L, EYE_Y - 1)}
            {heartEye(EYE_R, EYE_Y - 1)}
            <path
              d={`M${CX - 11} 28 C${CX - 11} 35 ${CX + 11} 35 ${CX + 11} 28 Z`}
              fill={color}
            />
          </>
        );
      case 'happy':
        return (
          <>
            {eyes()}
            <path d={`M${CX - 11} 28 C${CX - 11} 35 ${CX + 11} 35 ${CX + 11} 28 Z`} fill={color} />
          </>
        );
      case 'good':
        return (
          <>
            {eyes()}
            <path
              d={`M${CX - 8} 28 Q${CX} 33 ${CX + 8} 28`}
              fill="none"
              stroke={color}
              strokeWidth={SW}
              strokeLinecap="round"
            />
          </>
        );
      case 'neutral':
        return (
          <>
            {eyes()}
            <line
              x1={CX - 8}
              y1={30}
              x2={CX + 8}
              y2={30}
              stroke={color}
              strokeWidth={SW}
              strokeLinecap="round"
            />
          </>
        );
      case 'sad':
        return (
          <>
            {eyes()}
            <path
              d={`M${CX - 7} 31 Q${CX} 27 ${CX + 7} 31`}
              fill="none"
              stroke={color}
              strokeWidth={SW}
              strokeLinecap="round"
            />
          </>
        );
      case 'angry':
        return (
          <>
            {eyes()}
            <line
              x1={CX - 10}
              y1={16}
              x2={EYE_L + 1}
              y2={EYE_Y - 1}
              stroke={color}
              strokeWidth={SW}
              strokeLinecap="round"
            />
            <line
              x1={CX + 10}
              y1={16}
              x2={EYE_R - 1}
              y2={EYE_Y - 1}
              stroke={color}
              strokeWidth={SW}
              strokeLinecap="round"
            />
            <path
              d={`M${CX - 9} 32 Q${CX} 26 ${CX + 9} 32`}
              fill="none"
              stroke={color}
              strokeWidth={SW}
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
      <circle cx={CX} cy={CX} r={20.5} fill="none" stroke={color} strokeWidth={SW} />
      {mouth()}
    </svg>
  );
}
