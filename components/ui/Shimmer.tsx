'use client';

/**
 * Reusable shimmer/skeleton loading component.
 * Uses the same animation system as dawa-metrics and dawa-analytics.
 */

type ShimmerVariant =
  | 'text'
  | 'text-sm'
  | 'text-lg'
  | 'circle'
  | 'rect'
  | 'card'
  | 'avatar'
  | 'button'
  | 'chart'
  | 'stat-value'
  | 'stat-label';

interface ShimmerProps {
  /** Predefined variant or custom width/height */
  variant?: ShimmerVariant;
  /** Custom width (e.g., '100px', '80%') */
  width?: string;
  /** Custom height (e.g., '20px', '2rem') */
  height?: string;
  /** Additional CSS classes */
  className?: string;
  /** Border radius override */
  borderRadius?: string;
  /** Whether to display as block element */
  block?: boolean;
}

const variantStyles: Record<ShimmerVariant, { width: string; height: string; borderRadius?: string }> = {
  'text': { width: '100%', height: '16px' },
  'text-sm': { width: '80px', height: '12px' },
  'text-lg': { width: '200px', height: '20px' },
  'circle': { width: '48px', height: '48px', borderRadius: '50%' },
  'rect': { width: '100%', height: '100px' },
  'card': { width: '100%', height: '160px' },
  'avatar': { width: '44px', height: '44px', borderRadius: '50%' },
  'button': { width: '100px', height: '36px', borderRadius: '6px' },
  'chart': { width: '100%', height: '200px' },
  'stat-value': { width: '64px', height: '32px', borderRadius: '8px' },
  'stat-label': { width: '80px', height: '12px' },
};

export function Shimmer({
  variant = 'text',
  width,
  height,
  className = '',
  borderRadius,
  block = false,
}: ShimmerProps) {
  const styles = variantStyles[variant];
  const inlineStyle: React.CSSProperties = {
    width: width || styles.width,
    height: height || styles.height,
    borderRadius: borderRadius || styles.borderRadius || '6px',
  };

  return (
    <span
      className={`dawa-shimmer${block ? ' dawa-shimmer--block' : ''}${className ? ` ${className}` : ''}`}
      style={inlineStyle}
      aria-hidden
    />
  );
}

/**
 * Shimmer container for stat cards
 */
export function StatShimmer({ labelWidth = '80px' }: { labelWidth?: string }) {
  return (
    <div className="dawa-shimmer-stat">
      <Shimmer variant="stat-value" />
      <Shimmer variant="stat-label" width={labelWidth} />
    </div>
  );
}

/**
 * Shimmer for chart loading states
 */
export function ChartShimmer({ height = '200px' }: { height?: string }) {
  return (
    <div className="dawa-shimmer-chart" style={{ height }}>
      <div className="dawa-shimmer-chart__bars">
        {[65, 80, 45, 90, 55, 70, 50].map((h, i) => (
          <Shimmer
            key={i}
            className="dawa-shimmer-chart__bar"
            width="12%"
            height={`${h}%`}
            borderRadius="4px 4px 0 0"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Shimmer for notification items
 */
export function NotificationShimmer() {
  return (
    <div className="dawa-shimmer-notif">
      <Shimmer variant="circle" width="40px" height="40px" />
      <div className="dawa-shimmer-notif__content">
        <Shimmer variant="text" width="70%" />
        <Shimmer variant="text-sm" width="90%" />
        <Shimmer variant="text-sm" width="60px" />
      </div>
    </div>
  );
}

/**
 * Shimmer for connection/friend list items
 */
export function ConnectionShimmer() {
  return (
    <div className="dawa-shimmer-connection">
      <Shimmer variant="avatar" />
      <div className="dawa-shimmer-connection__content">
        <Shimmer variant="text" width="120px" />
        <Shimmer variant="text-sm" width="80px" />
      </div>
      <Shimmer variant="button" width="80px" />
    </div>
  );
}

/**
 * Shimmer for profile card
 */
export function ProfileShimmer() {
  return (
    <div className="dawa-shimmer-profile">
      <div className="dawa-shimmer-profile__hero">
        <Shimmer variant="circle" width="88px" height="88px" />
        <div className="dawa-shimmer-profile__info">
          <Shimmer variant="text-lg" width="160px" />
          <Shimmer variant="text" width="100px" />
          <Shimmer variant="text-sm" width="200px" />
        </div>
      </div>
    </div>
  );
}

/**
 * Shimmer for Ruhaniah page — mirrors the completed verse view layout
 */
export function RuhaniahShimmer() {
  return (
    <div className="dawa-ruhaniah">
      <div className="dawa-ruhaniah__intro">
        <Shimmer variant="text-lg" width="120px" />
        <Shimmer variant="text-sm" width="180px" />
      </div>
      <div className="dawa-verse dawa-verse--shimmer">
        <Shimmer variant="text-sm" width="160px" />
        <Shimmer variant="text-lg" width="80%" />
        <Shimmer variant="text" width="90%" />
        <Shimmer variant="text" width="70%" />
        <div className="dawa-verse__divider" />
        <Shimmer variant="card" width="100%" height="80px" />
        <Shimmer variant="card" width="100%" height="80px" />
      </div>
    </div>
  );
}
