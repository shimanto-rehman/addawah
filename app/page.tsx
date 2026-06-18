'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { IslamicBackdrop } from '@/components/layout/IslamicBackdrop';
import { BrandMark } from '@/components/ui/BrandMark';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { ThemeModeToggle } from '@/components/ui/ThemeModeToggle';
import { SITE_TAGLINE } from '@/lib/constants';

const FEATURES = [
  { icon: '🕌', title: 'Salah Tracker', desc: 'A weekly mihrab-style tracker framed by an ornate golden arch — mark all five prayers with one tap.' },
  { icon: '🤝', title: 'Brotherhood', desc: 'Connect with friends and send gentle reminders rooted in mercy, not judgment.' },
  { icon: '📿', title: 'Daily Wisdom', desc: 'Begin each day with Qur\'anic verses and prophetic traditions to nourish the soul.' },
  { icon: '🌙', title: 'Hijri Calendar', desc: 'Live in both worlds — Gregorian dates alongside the Islamic lunar calendar.' },
  { icon: '📊', title: 'Worship Analytics', desc: 'See your consistency grow through beautiful lifetime charts and prayer breakdowns.' },
  { icon: '🎨', title: 'Six Sacred Palettes', desc: 'Gold, Emerald, Sapphire, Amethyst, Silver, and Rose — each in dark or light mode.' },
];

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#journey', label: 'Journey' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <IslamicBackdrop />
      <div className="dawa-landing">
        <header className="dawa-landing-nav">
          <div className="dawa-landing-nav__inner">
            <Link href="/" className="dawa-brand">
              <BrandMark />
              <span className="dawa-brand__text">
                <span className="dawa-brand__name">Addawah</span>
              </span>
            </Link>

            <nav className="dawa-landing-nav__links" aria-label="Landing">
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
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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

        <section className="dawa-hero">
          <div className="dawa-hero__grid">
            <motion.div
              className="dawa-hero__content"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="dawa-hero__bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
              <h1 className="dawa-hero__title">
                Pray <em>Together.</em><br />
                Grow <em>Together.</em>
              </h1>
              <p className="dawa-hero__desc">{SITE_TAGLINE} A sanctuary for salah, accountability, and spiritual growth — crafted for the ummah.</p>
              <div className="dawa-hero__actions">
                <Link href="/login" className="dawa-btn dawa-btn--primary">Start Your Journey</Link>
                <a href="#features" className="dawa-btn dawa-btn--outline">Explore Features</a>
              </div>
            </motion.div>
            <motion.div
              className="dawa-hero__visual"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2 }}
            >
              <div className="dawa-hero__arch-frame" aria-hidden />
            </motion.div>
          </div>
        </section>

        <section className="dawa-section" id="features">
          <div className="dawa-section__head">
            <h2 className="dawa-section__title">Built for worship, not distraction</h2>
            <p className="dawa-section__sub">Every pixel honours the beauty of Islamic tradition while staying modern and effortless.</p>
          </div>
          <div className="dawa-features">
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                className="dawa-feature"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <div className="dawa-feature__icon">{f.icon}</div>
                <h3 className="dawa-feature__title">{f.title}</h3>
                <p className="dawa-feature__desc">{f.desc}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="dawa-section dawa-section--cta" id="journey">
          <h2 className="dawa-section__title">Your journey begins with one prayer</h2>
          <p className="dawa-section__sub dawa-section__sub--center">Free forever. No ads. No limits. For the sake of Allah.</p>
          <Link href="/login" className="dawa-btn dawa-btn--primary">Create Free Account</Link>
        </section>

        <footer className="dawa-landing-footer">
          © {new Date().getFullYear()} Addawah — {SITE_TAGLINE}
        </footer>
      </div>
    </>
  );
}
