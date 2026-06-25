'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { SunPathArc } from '@/components/dashboard/SunPathArc';
import { getGregorianLabel, toHijri } from '@/lib/salah-utils';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { WaktCountdownClock } from '@/components/layout/WaktCountdownClock';
import { useApp } from '@/components/providers/AppProvider';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  greeting?: string;
  arabicLabel?: string;
  variant?: 'home' | 'page';
  toolbar?: ReactNode;
};

function HijriBlock({ compact = false }: { compact?: boolean }) {
  const hijri = toHijri();
  return (
    <div className={`dawa-intro__cal${compact ? ' dawa-intro__cal--compact' : ''}`}>
      <span className="dawa-intro__cal-day dawa-num">{hijri.day || '—'}</span>
      <span className="dawa-intro__cal-mon">{hijri.month}</span>
      {hijri.year && (
        <span className="dawa-intro__cal-yr">
          <span className="dawa-num">{hijri.year}</span> AH
        </span>
      )}
    </div>
  );
}

function HomeHeader({ greeting, title }: { greeting?: string; title: string }) {
  const { user } = useApp();

  return (
    <header className="dawa-sky">
      <div className="dawa-sky__top">
        <Link href="/profile" className="dawa-sky__who">
          {user && (
            <UserAvatar
              userId={user.id}
              name={user.name}
              avatarColor={user.avatarColor}
              avatarUrl={user.avatarUrl}
              size={44}
            />
          )}
          <span className="dawa-sky__text">
            {greeting && <span className="dawa-sky__salam">{greeting}</span>}
            <span className="dawa-sky__name">{user?.name ?? title}</span>
          </span>
        </Link>
        <WaktCountdownClock variant="greet" />
      </div>

      <SunPathArc />
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  greeting,
  arabicLabel,
  variant = 'page',
  toolbar,
}: PageHeaderProps) {
  const gregorian = getGregorianLabel();

  if (variant === 'home') {
    return <HomeHeader greeting={greeting} title={title} />;
  }

  return (
    <header className="dawa-intro dawa-intro--page">
      <div
        className={`dawa-intro__sheet dawa-intro__sheet--page${toolbar ? ' dawa-intro__sheet--with-toolbar' : ''}`}
      >
        <div className="dawa-intro__copy">
          {arabicLabel && <p className="dawa-intro__ar dawa-intro__ar--ghost">{arabicLabel}</p>}
          <h1 className="dawa-intro__name dawa-intro__name--page">{title}</h1>
          {subtitle && <p className="dawa-intro__line">{subtitle}</p>}
          <time className="dawa-intro__greg">{gregorian}</time>
        </div>
        {toolbar && <div className="dawa-intro__toolbar">{toolbar}</div>}
        <HijriBlock compact />
      </div>
    </header>
  );
}
