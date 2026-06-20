import { getInitials } from '@/lib/constants';

type UserAvatarProps = {
  name: string;
  avatarColor: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
};

export function UserAvatar({
  name,
  avatarColor,
  avatarUrl,
  size = 36,
  className = '',
}: UserAvatarProps) {
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`dawa-avatar dawa-avatar--photo${className ? ` ${className}` : ''}`}
        style={style}
      />
    );
  }

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
