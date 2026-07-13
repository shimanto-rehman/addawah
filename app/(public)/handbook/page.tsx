'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicNav } from '@/components/landing/PublicNav';

const PDF_SRC = '/assets/pdfs/Dua.pdf';
const THUMB_SRC = '/assets/images/thumbnail.webp';

export default function HandbookPage() {
  const [viewerOpen, setViewerOpen] = useState(false);

  const openViewer = useCallback(() => setViewerOpen(true), []);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewerOpen, closeViewer]);

  // Lock body scroll when viewer is open
  useEffect(() => {
    if (viewerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [viewerOpen]);

  return (
    <div className="dawa-landing">
      <PublicNav />
      <div className="dawa-handbook">
        <section className="dawa-handbook__hero">
          <motion.p
            className="dawa-handbook__arabic"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            كِتَابُ الدَّعْوَةِ
          </motion.p>
          <motion.h1
            className="dawa-handbook__title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            The Addawah <em>Handbook</em>
          </motion.h1>
          <motion.p
            className="dawa-handbook__subtitle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
          >
            A curated guide to daily duas, adhkar, and prophetic supplications —
            beautifully formatted for easy reading and memorisation.
          </motion.p>
        </section>

        <motion.section
          className="dawa-handbook__card-wrap"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
        >
          <button
            type="button"
            className="dawa-handbook__thumbnail"
            onClick={openViewer}
            aria-label="Open handbook PDF reader"
          >
            <div className="dawa-handbook__thumb-frame">
              <Image
                src={THUMB_SRC}
                alt="Addawah Handbook cover"
                fill
                sizes="(max-width: 480px) 90vw, 420px"
                className="dawa-handbook__thumb-img"
                priority
              />
              <div className="dawa-handbook__thumb-overlay">
                <span className="dawa-handbook__play-icon" aria-hidden>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </span>
                <span className="dawa-handbook__play-label">Read Now</span>
              </div>
            </div>
            <p className="dawa-handbook__thumb-caption">Tap to open the PDF reader</p>
          </button>

          <div className="dawa-handbook__actions">
            <button
              type="button"
              className="dawa-btn dawa-btn--primary"
              onClick={openViewer}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              Read Handbook
            </button>
            <a
              href={PDF_SRC}
              download
              className="dawa-btn dawa-btn--outline"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download PDF
            </a>
          </div>
        </motion.section>

        {/* Back to landing */}
        <div className="dawa-handbook__back">
          <Link href="/" className="dawa-btn dawa-btn--outline">
            ← Back to Home
          </Link>
        </div>

        {/* Fullscreen PDF Viewer */}
        <AnimatePresence>
          {viewerOpen && (
            <motion.div
              className="dawa-handbook__overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => {
                if (e.target === e.currentTarget) closeViewer();
              }}
            >
              <motion.div
                className="dawa-handbook__viewer"
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="dawa-handbook__toolbar">
                  <span className="dawa-handbook__toolbar-title">Addawah Handbook</span>
                  <div className="dawa-handbook__toolbar-actions">
                    <a
                      href={PDF_SRC}
                      download
                      className="dawa-handbook__tool-btn"
                      aria-label="Download PDF"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </a>
                    <button
                      type="button"
                      className="dawa-handbook__tool-btn"
                      onClick={closeViewer}
                      aria-label="Close reader"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
                <iframe
                  src={PDF_SRC}
                  title="Addawah Handbook PDF"
                  className="dawa-handbook__iframe"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
