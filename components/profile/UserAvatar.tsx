'use client';

import { useEffect, useState } from 'react';
import { getInitials } from '@/lib/constants';

type UserAvatarProps = {
  name: string;
  avatarColor: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  variant?: 'silhouette' | 'initials';
};

function SilhouetteIcon({ size }: { size: number }) {
  return (
    <svg
      width={size * 0.52}
      height={size * 0.52}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.87 0-7 2.13-7 4.75V21h14v-2.25C19 16.13 15.87 14 12 14z" />
    </svg>
  );
}

function DefaultAvatar({
  name,
  avatarColor,
  size = 36,
  className,
  variant,
}: Omit<UserAvatarProps, 'avatarUrl'>) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) };

  if (variant === 'initials') {
    return (
      <span
        className={`dawa-avatar dawa-avatar--initials${className ? ` ${className}` : ''}`}
        style={{ ...style, background: avatarColor }}
        aria-hidden
      >
        {getInitials(name)}
      </span>
    );
  }

  return (
    <span
      className={`dawa-avatar dawa-avatar--silhouette${className ? ` ${className}` : ''}`}
      style={{ ...style, background: `color-mix(in srgb, ${avatarColor} 28%, var(--surface-2))` }}
      aria-hidden
      title={name}
    >
      <SilhouetteIcon size={size} />
    </span>
  );
}

export function UserAvatar({
  name,
  avatarColor,
  avatarUrl,
  size = 36,
  className = '',
  variant = 'silhouette',
}: UserAvatarProps) {
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [avatarUrl]);

  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) };

  if (!avatarUrl || photoFailed) {
    return (
      <DefaultAvatar
        name={name}
        avatarColor={avatarColor}
        size={size}
        className={className}
        variant={variant}
      />
    );
  }

  return (
    <img
      src={avatarUrl}
      alt=""
      className={`dawa-avatar dawa-avatar--photo${className ? ` ${className}` : ''}`}
      style={style}
      onError={() => setPhotoFailed(true)}
    />
  );
}
