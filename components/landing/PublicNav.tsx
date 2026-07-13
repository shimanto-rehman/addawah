'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Shared across every public page's header so the nav never differs between pages. */
export const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#journey', label: 'Journey' },
  { href: '/truth', label: 'Truth' },
  { href: '/handbook', label: 'Handbook' },
];

/** The one header rendered on every public-facing page (landing, truth, handbook, …). */
export function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="dawa-landing-nav">
      <div className="dawa-landing-nav__inner">
        <Link href="/" className="dawa-brand">
          <BrandMark />
          <span className="dawa-brand__text">
            <span className="dawa-brand__name">Addawah</span>
          </span>
        </Link>

        <nav className="dawa-landing-nav__links" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>

        <div className="dawa-landing-nav__actions">
          <ThemeModeToggle compact />
          <ThemeSwitcher compact />
          <Link href="/login" className="dawa-btn dawa-btn--outline dawa-landing-nav__signin">Sign In</Link>
          <Link href="/login" className="dawa-btn dawa-btn--primary">Begin</Link>
        </div>

        <div className="dawa-landing-nav__actions dawa-landing-nav__actions--mobile">
          <ThemeModeToggle compact />
          <ThemeSwitcher compact />
        </div>

        <button
          type="button"
          className="dawa-landing-nav__menu-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`dawa-landing-nav__menu-icon${menuOpen ? ' is-open' : ''}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="dawa-landing-nav__mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <nav className="dawa-landing-nav__mobile-links" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} onClick={closeMenu}>{link.label}</a>
              ))}
            </nav>
            <div className="dawa-landing-nav__mobile-actions">
              <Link href="/login" className="dawa-btn dawa-btn--outline" onClick={closeMenu}>Sign In</Link>
              <Link href="/login" className="dawa-btn dawa-btn--primary" onClick={closeMenu}>Begin</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
