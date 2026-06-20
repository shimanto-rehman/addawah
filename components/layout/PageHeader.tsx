'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { SunPathArc } from '@/components/dashboard/SunPathArc';
import { getGregorianLabel, toHijri } from '@/lib/salah-utils';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { LiveClock } from '@/components/layout/LiveClock';
import { useApp } from '@/components/providers/AppProvider';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  greeting?: string;
  arabicLabel?: string;
  variant?: 'home' | 'page';
};

function HijriBlock({ compact = false }: { compact?: boolean }) {
  const hijri = toHijri();
  return (
    <div className={`dawa-intro__cal${compact ? ' dawa-intro__cal--compact' : ''}`}>
      <span className="dawa-intro__cal-day">{hijri.day || '—'}</span>
      <span className="dawa-intro__cal-mon">{hijri.month}</span>
      {hijri.year && <span className="dawa-intro__cal-yr">{hijri.year} AH</span>}
    </div>
  );
}

function HomeHeader({ greeting, title }: { greeting?: string; title: string }) {
  const { user } = useApp();
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      className="dawa-sky"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="dawa-sky__top">
        <Link href="/profile" className="dawa-sky__who">
          {user && (
            <UserAvatar
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
        <LiveClock variant="greet" />
      </div>

      <SunPathArc />
    </motion.header>
  );
}

export function PageHeader({
  title,
  subtitle,
  greeting,
  arabicLabel,
  variant = 'page',
}: PageHeaderProps) {
  const gregorian = getGregorianLabel();
  const reduceMotion = useReducedMotion();

  if (variant === 'home') {
    return <HomeHeader greeting={greeting} title={title} />;
  }

  return (
    <motion.header
      className="dawa-intro dawa-intro--page"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className="dawa-intro__sheet dawa-intro__sheet--page">
        <div className="dawa-intro__copy">
          {arabicLabel && <p className="dawa-intro__ar dawa-intro__ar--ghost">{arabicLabel}</p>}
          <h1 className="dawa-intro__name dawa-intro__name--page">{title}</h1>
          {subtitle && <p className="dawa-intro__line">{subtitle}</p>}
          <time className="dawa-intro__greg">{gregorian}</time>
        </div>
        <HijriBlock compact />
      </div>
    </motion.header>
  );
}
