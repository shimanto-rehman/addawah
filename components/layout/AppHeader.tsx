'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';
import { UserMenu } from '@/components/layout/UserMenu';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useNotifications } from '@/components/notifications/useNotifications';
import { useApp } from '@/components/providers/AppProvider';

type NavIconName = 'home' | 'friends' | 'analytics' | 'settings' | 'notifications';

const DESKTOP_NAV: { href: string; label: string; icon: NavIconName }[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/friends', label: 'Friends', icon: 'friends' },
  { href: '/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

const MOBILE_TAB_NAV: { href: string; label: string; icon: NavIconName }[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/friends', label: 'Friends', icon: 'friends' },
  { href: '/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/notifications', label: 'Alerts', icon: 'notifications' },
];

function NavIcon({ name }: { name: NavIconName }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20h14V9.5" />
        </svg>
      );
    case 'friends':
      return (
        <svg {...props}>
          <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
          <circle cx="9" cy="8" r="3.5" />
          <path d="M22 19v-1a4 4 0 0 0-3-3.87" />
          <path d="M16 4.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'analytics':
      return (
        <svg {...props}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20V8" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 2v2.25M12 19.75V22M4.22 4.22l1.59 1.59M18.19 18.19l1.59 1.59M2 12h2.25M19.75 12H22M4.22 19.78l1.59-1.59M18.19 5.81l1.59-1.59" />
        </svg>
      );
    case 'notifications':
      return (
        <svg {...props}>
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
  }
}

export function AppHeader() {
  const pathname = usePathname();
  const { user } = useApp();

  return (
    <header className="dawa-header">
      <div className="dawa-header__inner">
        <Link href="/dashboard" className="dawa-brand">
          <BrandMark />
          <span className="dawa-brand__text">
            <span className="dawa-brand__name">Addawah</span>
          </span>
        </Link>

        <nav className="dawa-header__nav" aria-label="Main">
          {DESKTOP_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dawa-nav-link${active ? ' is-active' : ''}`}
              >
                <span className="dawa-nav-link__icon">
                  <NavIcon name={item.icon} />
                </span>
                <span className="dawa-nav-link__label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dawa-header__actions">
          <ThemeModeToggle compact />
          <ThemeSwitcher compact />
          {user && <NotificationBell />}
          {user && <UserMenu user={user} />}
        </div>
      </div>
      <div className="dawa-header__ornament" aria-hidden />
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const { data } = useNotifications(60_000);
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <nav className="dawa-tabbar" aria-label="Mobile navigation">
      <div className="dawa-tabbar__inner">
        {MOBILE_TAB_NAV.map((item) => {
          const active = pathname === item.href;
          const showBadge = item.icon === 'notifications' && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dawa-tabbar__link${active ? ' is-active' : ''}`}
            >
              <span className="dawa-tabbar__icon">
                <NavIcon name={item.icon} />
                {showBadge && (
                  <span className="dawa-tabbar__badge" aria-hidden>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="dawa-tabbar__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
