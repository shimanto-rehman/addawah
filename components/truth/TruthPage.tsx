'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { PublicNav } from '@/components/landing/PublicNav';
import { DEVELOPER, getInitials, SITE_TAGLINE } from '@/lib/constants';
import { PASSAGES, PRAYER_STORY, TRUTH_FOUNDER_IMAGE, truthPassageImage, type Passage } from '@/components/truth/truthContent';
import { TruthImage } from '@/components/truth/TruthImage';
import { GradientWrap } from '@/components/truth/GradientWrap';

const EASE = [0.22, 1, 0.36, 1] as const;

type PassageGroup = { kind: 'grid'; items: Passage[] } | { kind: 'feature'; item: Passage };

function groupPassages(passages: Passage[]): PassageGroup[] {
  const groups: PassageGroup[] = [];
  let bucket: Passage[] = [];
  for (const passage of passages) {
    if (passage.feature) {
      if (bucket.length) {
        groups.push({ kind: 'grid', items: bucket });
        bucket = [];
      }
      groups.push({ kind: 'feature', item: passage });
    } else {
      bucket.push(passage);
    }
  }
  if (bucket.length) groups.push({ kind: 'grid', items: bucket });
  return groups;
}

const PASSAGE_GROUPS = groupPassages(PASSAGES);

function PassageCard({ passage, onOpen }: { passage: Passage; onOpen: () => void }) {
  return (
    <motion.article
      className="dawa-truth-card"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <TruthImage src={truthPassageImage(passage.id)} alt={passage.title} />
      <div className="dawa-truth-card__body">
        <p className="dawa-truth-card__kicker">{passage.kicker}</p>
        <h3 className="dawa-truth-card__title">{passage.title}</h3>
        <p className="dawa-truth-card__preview">{passage.preview}</p>
        <button type="button" className="dawa-truth-card__more" onClick={onOpen}>
          Learn more
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </motion.article>
  );
}

function PassageFeature({ passage, onOpen }: { passage: Passage; onOpen: () => void }) {
  return (
    <GradientWrap className="dawa-truth-feature-wrap" boxClassName="dawa-truth-feature-box" baseMaxWidth={1152} baseRadius={24}>
      <TruthImage src={truthPassageImage(passage.id)} alt={passage.title} className="dawa-truth-media--fill" />
      <div className="dawa-truth-feature-overlay" aria-hidden />
      <motion.div
        className="dawa-truth-feature-content"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <p className="dawa-truth-feature-kicker">{passage.kicker}</p>
        <h3 className="dawa-truth-feature-title">{passage.title}</h3>
        <p className="dawa-truth-feature-preview">{passage.preview}</p>
        <button type="button" className="dawa-truth-feature-more" onClick={onOpen}>
          Learn more
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </motion.div>
    </GradientWrap>
  );
}

export function TruthPage() {
  const [active, setActive] = useState<Passage | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <div className="dawa-landing dawa-truth">
      <PublicNav />

      {/* ── Hero: headline row, then hero-gradient-wrap (breaks out, expands on scroll) ── */}
      <section className="dawa-truth-hero" aria-labelledby="truth-heading">
        <div className="dawa-truth-hero__head">
          <span className="dawa-truth-badge">Reflections on faith &amp; reason</span>
          <h1 className="dawa-truth-hero__title" id="truth-heading">
            In search of <em>Truth.</em>
          </h1>
          <p className="dawa-truth-hero__desc">
            Fifteen passages where science, philosophy, and revelation meet — questions about
            time, consciousness, design, and the unseen, each returning to one signpost: the
            Creator behind creation.
          </p>
          <div className="dawa-hero__actions">
            <a href="#passages" className="dawa-btn dawa-btn--primary">Begin Reading</a>
            <a href="#talk" className="dawa-btn dawa-btn--outline">Share a Thought</a>
          </div>
        </div>

        <GradientWrap id="truth-hero-gradient-wrap" className="dawa-truth-hero-gradient" boxClassName="dawa-truth-hero-gradient-box" baseMaxWidth={1152} baseRadius={28}>
          <div className="dawa-truth-rings" aria-hidden>
            <svg viewBox="0 0 370 260" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="truth-ring-a" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-bright)" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--accent-bright)" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="truth-ring-b" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent-bright)" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="var(--accent-bright)" stopOpacity="0.95" />
                </linearGradient>
                <clipPath id="truth-clip"><circle cx="235" cy="130" r="100" /></clipPath>
              </defs>
              <circle cx="135" cy="130" r="100" fill="var(--accent)" opacity="0.06" clipPath="url(#truth-clip)" />
              <g className="dawa-truth-rings__a">
                <circle cx="135" cy="130" r="100" stroke="url(#truth-ring-a)" strokeWidth="0.9" fill="none" />
                <circle cx="135" cy="30" r="2.4" fill="var(--accent-bright)" />
              </g>
              <g className="dawa-truth-rings__b">
                <circle cx="235" cy="130" r="100" stroke="url(#truth-ring-b)" strokeWidth="0.9" fill="none" />
                <circle cx="235" cy="230" r="2.4" fill="var(--accent-bright)" />
              </g>
            </svg>
          </div>
        </GradientWrap>
      </section>

      {/* ── The 15 passages: grid of cards, with a few full-bleed feature rows ── */}
      <section className="dawa-section dawa-truth-passages" id="passages" aria-labelledby="passages-heading">
        <div className="dawa-section__head">
          <h2 className="dawa-section__title" id="passages-heading">Fifteen doors to one question</h2>
          <p className="dawa-section__sub">
            Each passage stands on its own — read the summary, then open the full reflection when a
            question pulls you in.
          </p>
        </div>

        {PASSAGE_GROUPS.map((group, gi) =>
          group.kind === 'grid' ? (
            <div className="dawa-truth-grid" key={`grid-${gi}`}>
              {group.items.map((passage) => (
                <PassageCard key={passage.id} passage={passage} onOpen={() => setActive(passage)} />
              ))}
            </div>
          ) : (
            <PassageFeature key={`feature-${group.item.id}`} passage={group.item} onOpen={() => setActive(group.item)} />
          ),
        )}
      </section>

      {/* ── Founding (team-gradient-wrap style: full-bleed photo + my info) ── */}
      <section className="dawa-section dawa-truth-founder" id="founder" aria-labelledby="founder-heading">
        <GradientWrap className="dawa-truth-founder-wrap" boxClassName="dawa-truth-founder-box" baseMaxWidth={1152} baseRadius={24}>
          <TruthImage src={TRUTH_FOUNDER_IMAGE} alt="" className="dawa-truth-media--fill" />
          <div className="dawa-truth-founder-overlay" aria-hidden />
          <div className="dawa-truth-founder__grid">
            <div className="dawa-truth-founder__intro">
              <span className="dawa-truth-badge dawa-truth-badge--on-dark">The one behind it</span>
              <h2 className="dawa-section__title" id="founder-heading">Written, built, and shared</h2>
              <p className="dawa-section__sub">
                These reflections and the platform that carries them come from one person — gathering
                ideas from science and scripture and shaping them into something you can hold.
              </p>
            </div>
            <div className="dawa-truth-founder__card">
              <div className="dawa-truth-founder__photo">
                {photoFailed ? (
                  <span className="dawa-truth-founder__initials">{getInitials(DEVELOPER.name)}</span>
                ) : (
                  <img
                    src={DEVELOPER.photoSrc}
                    alt={DEVELOPER.name}
                    width={120}
                    height={120}
                    onError={() => setPhotoFailed(true)}
                  />
                )}
              </div>
              <p className="dawa-truth-founder__name">{DEVELOPER.name}</p>
              <p className="dawa-truth-founder__role">{DEVELOPER.role}</p>
              <p className="dawa-truth-founder__bio">{DEVELOPER.bio}</p>
              <a
                className="dawa-btn dawa-btn--outline"
                href={DEVELOPER.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                www.shimanto.online
              </a>
            </div>
          </div>
        </GradientWrap>
      </section>

      {/* ── Our Story = Passage 14 (prayer), cloned from the template's Timeline ── */}
      <section className="dawa-truth-timeline" id="story" aria-labelledby="story-heading">
        <div className="dawa-truth-timeline__container">
          <div className="dawa-truth-timeline__grid">
            <div className="dawa-truth-timeline__aside">
              <span className="dawa-truth-badge">{PRAYER_STORY.kicker}</span>
              <h2 className="dawa-truth-timeline__title" id="story-heading">{PRAYER_STORY.title}</h2>
              <p className="dawa-truth-timeline__desc">{PRAYER_STORY.intro}</p>
            </div>
            <div className="dawa-truth-timeline__list">
              <div className="dawa-truth-timeline__line" aria-hidden />
              {PRAYER_STORY.items.map((item, i) => {
                const isFirst = i === 0;
                const isLast = i === PRAYER_STORY.items.length - 1;
                return (
                  <div key={item.label} className={`dawa-truth-timeline__item${isLast ? ' is-last' : ''}`}>
                    <span
                      className={`dawa-truth-timeline__dot${isFirst ? ' is-active' : ''}${isLast ? ' is-faint' : ''}`}
                      aria-hidden
                    />
                    <h3 className="dawa-truth-timeline__label">{item.label}</h3>
                    <p className="dawa-truth-timeline__text">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Let's Talk (hero-gradient-wrap style, same breakout + scroll expand) ── */}
      <section className="dawa-section dawa-truth-talk-section" id="talk" aria-labelledby="talk-heading">
        <GradientWrap className="dawa-truth-talk-wrap" boxClassName="dawa-truth-talk-box" baseMaxWidth={900} baseRadius={28}>
          <div className="dawa-truth-talk__glow" aria-hidden />
          <div className="dawa-truth-talk__inner">
            <h2 className="dawa-section__title" id="talk-heading">Let&apos;s talk</h2>
            <p className="dawa-section__sub dawa-section__sub--center">
              Have a further question, an interesting concept, or an observation to share? This space is
              open — bring the thought that has been sitting with you.
            </p>
            <form className="dawa-truth-talk__form" onSubmit={(e) => e.preventDefault()}>
              <div className="dawa-truth-talk__row">
                <label className="dawa-truth-field">
                  <span>Name</span>
                  <input type="text" name="name" placeholder="Your name" autoComplete="name" />
                </label>
                <label className="dawa-truth-field">
                  <span>Email</span>
                  <input type="email" name="email" placeholder="you@example.com" autoComplete="email" />
                </label>
              </div>
              <label className="dawa-truth-field">
                <span>Your question or observation</span>
                <textarea name="message" rows={4} placeholder="Share a question, a concept, or something you noticed…" />
              </label>
              <button type="submit" className="dawa-btn dawa-btn--primary">Share your thought</button>
            </form>
          </div>
        </GradientWrap>
      </section>

      <footer className="dawa-landing-footer">
        <p className="dawa-landing-footer__copy">
          © {new Date().getFullYear()} Addawah — {SITE_TAGLINE}
        </p>
      </footer>

      {/* ── Learn-more blurry popup ── */}
      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        panelClassName="dawa-truth-modal"
        labelledBy="truth-modal-title"
        unstyled
      >
        {active && (
          <div className="dawa-truth-modal__layout">
            <div className="dawa-truth-modal__banner">
              <TruthImage src={truthPassageImage(active.id)} alt="" className="dawa-truth-media--fill" />
            </div>
            <div className="dawa-truth-modal__content">
              <div className="dawa-truth-modal__head">
                <div>
                  <p className="dawa-truth-modal__kicker">{active.kicker}</p>
                  <h2 className="dawa-truth-modal__title" id="truth-modal-title">{active.title}</h2>
                </div>
                <button
                  type="button"
                  className="dawa-truth-modal__close"
                  onClick={() => setActive(null)}
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="dawa-truth-modal__body">
                {active.body.map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
