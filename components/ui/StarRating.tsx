type StarRatingProps = {
  rating: number;
  max?: number;
  size?: 'sm' | 'md';
};

export function StarRating({ rating, max = 5, size = 'md' }: StarRatingProps) {
  const clamped = Math.max(0, Math.min(max, rating));

  return (
    <div
      className={`dawa-stars dawa-stars--${size}`}
      role="img"
      aria-label={`${clamped} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`dawa-stars__star${i < clamped ? ' is-filled' : ''}`}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}
