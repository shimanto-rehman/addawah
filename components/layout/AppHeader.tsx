'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';
import { useApp } from '@/components/providers/AppProvider';
import { getInitials } from '@/lib/constants';

const NAV = [
  { href: '/dashboard', label: 'Home', arabic: 'الرئيسية' },
  { href: '/friends', label: 'Friends', arabic: 'الأصدقاء' },
  { href: '/analytics', label: 'Analytics', arabic: 'الإحصاء' },
  { href: '/settings', label: 'Settings', arabic: 'الإعدادات' },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useApp();

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
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dawa-nav-link${active ? ' is-active' : ''}`}
              >
                {active && (
                  <motion.span
                    layoutId="dawa-nav-pill"
                    className="dawa-nav-link__pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="dawa-nav-link__en">{item.label}</span>
                <span className="dawa-nav-link__ar">{item.arabic}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dawa-header__actions">
          <ThemeModeToggle compact />
          <ThemeSwitcher compact />
          {user && (
            <div className="dawa-user-chip">
              <span className="dawa-user-chip__avatar" style={{ background: user.avatarColor }}>
                {getInitials(user.name)}
              </span>
              <span className="dawa-user-chip__name">{user.name.split(' ')[0]}</span>
              <button type="button" className="dawa-user-chip__logout" onClick={() => logout()} aria-label="Sign out">
                ↗
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="dawa-header__ornament" aria-hidden />
    </header>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="dawa-tabbar" aria-label="Mobile navigation">
      <div className="dawa-tabbar__inner">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`dawa-tabbar__link${pathname === item.href ? ' is-active' : ''}`}
          >
            <span className="dawa-tabbar__dot" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
