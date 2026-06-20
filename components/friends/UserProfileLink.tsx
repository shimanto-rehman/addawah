'use client';

import Link from 'next/link';
import { userProfilePath } from '@/lib/user-public-stats';

type UserProfileLinkProps = {
  username: string | null | undefined;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function UserProfileLink({ username, children, className = '', onClick }: UserProfileLinkProps) {
  if (!username) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={userProfilePath(username)} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
