'use client';

import Link from 'next/link';
import { PublicNav } from '@/components/landing/PublicNav';
import { PeopleFeedback } from '@/components/landing/PeopleFeedback';
import { DeveloperCredit } from '@/components/landing/DeveloperCredit';
import { SITE_TAGLINE } from '@/lib/constants';

const FEATURES = [
  { icon: '🕌', title: 'Salah Tracker', desc: 'A weekly mihrab-style tracker framed by an ornate golden arch — mark all five prayers with one tap.' },
  { icon: '🤝', title: 'Brotherhood', desc: 'Connect with friends and send gentle reminders rooted in mercy, not judgment.' },
  { icon: '📿', title: 'Daily Wisdom', desc: 'Begin each day with Qur\'anic verses and prophetic traditions to nourish the soul.' },
  { icon: '🌙', title: 'Hijri Calendar', desc: 'Live in both worlds — Gregorian dates alongside the Islamic lunar calendar.' },
  { icon: '📊', title: 'Worship Analytics', desc: 'See your consistency grow through beautiful lifetime charts and prayer breakdowns.' },
  { icon: '✨', title: 'Ruhaniah Check-in', desc: 'A nightly spiritual pulse — Taqwa, Fahm, Barakah, and Duas matched to a Quranic verse for your state.' },
  { icon: '📈', title: 'Iman Meter', desc: 'A living faith index that rises with on-time prayers and heals with every sincere return.' },
  { icon: '🎯', title: 'Daily Challenge', desc: 'Rotating deeds with gold-coin rewards — small consistent actions that compound into lasting habit.' },
  { icon: '🎨', title: 'Six Sacred Palettes', desc: 'Gold, Emerald, Sapphire, Amethyst, Silver, and Rose — each in dark or light mode.' },
];

export function LandingPage() {
  return (
    <>
      <div className="dawa-landing">
        <PublicNav />

        <section className="dawa-hero" aria-labelledby="hero-heading">
          <div className="dawa-hero__grid">
            <div className="dawa-hero__content">
              <p className="dawa-hero__bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
              <h1 className="dawa-hero__title" id="hero-heading">
                Pray <em>Together.</em><br />
                Grow <em>Together.</em>
              </h1>
              <p className="dawa-hero__desc">{SITE_TAGLINE} A sanctuary for salah, accountability, and spiritual growth — crafted for the ummah.</p>
              <div className="dawa-hero__actions">
                <Link href="/login" className="dawa-btn dawa-btn--primary">Start Your Journey</Link>
                <a href="#features" className="dawa-btn dawa-btn--outline">Explore Features</a>
              </div>
            </div>
            <div className="dawa-hero__visual">
              <div className="dawa-hero__arch-frame" aria-hidden />
            </div>
          </div>
        </section>

        <section className="dawa-section" id="features" aria-labelledby="features-heading">
          <div className="dawa-section__head">
            <h2 className="dawa-section__title" id="features-heading">Built for worship, not distraction</h2>
            <p className="dawa-section__sub">Every pixel honours the beauty of Islamic tradition while staying modern and effortless.</p>
          </div>
          <div className="dawa-features">
            {FEATURES.map((f) => (
              <article key={f.title} className="dawa-feature">
                <div className="dawa-feature__icon" aria-hidden>{f.icon}</div>
                <h3 className="dawa-feature__title">{f.title}</h3>
                <p className="dawa-feature__desc">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dawa-section dawa-section--cta" id="journey" aria-labelledby="journey-heading">
          <h2 className="dawa-section__title" id="journey-heading">Your journey begins with one prayer</h2>
          <p className="dawa-section__sub dawa-section__sub--center">Free forever. No ads. No limits. For the sake of Allah.</p>
          <Link href="/login" className="dawa-btn dawa-btn--primary">Create Free Account</Link>
        </section>

        <PeopleFeedback />

        <DeveloperCredit />

        <footer className="dawa-landing-footer">
          <p className="dawa-landing-footer__copy">
            © {new Date().getFullYear()} Addawah — {SITE_TAGLINE}
          </p>
        </footer>
      </div>
    </>
  );
}
