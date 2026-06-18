'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/providers/ThemeProvider';
import { THEME_COLORS, THEME_COLOR_LABELS, type ThemeColor } from '@/lib/constants';

const PANEL_WIDTH = 320;
const PANEL_GAP = 10;
const VIEWPORT_PAD = 12;

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { color, setColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelHeight = panel?.offsetHeight ?? 360;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(PANEL_WIDTH, vw - VIEWPORT_PAD * 2);

    let left = rect.right - width;
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - width - VIEWPORT_PAD));

    let top = rect.bottom + PANEL_GAP;
    if (top + panelHeight > vh - VIEWPORT_PAD) {
      top = rect.top - panelHeight - PANEL_GAP;
    }
    top = Math.max(VIEWPORT_PAD, Math.min(top, vh - panelHeight - VIEWPORT_PAD));

    setPanelStyle({
      position: 'fixed',
      top,
      left,
      width,
      right: 'auto',
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    const ro = panelRef.current ? new ResizeObserver(updatePosition) : null;
    if (panelRef.current) ro?.observe(panelRef.current);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const panel = (
    <motion.div
      ref={panelRef}
      className="dawa-theme__panel dawa-theme__panel--portal"
      style={panelStyle}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-label="Color palette"
    >
      <div className="dawa-theme__panel-head">
        <div className="dawa-theme__panel-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </div>
        <div>
          <p className="dawa-theme__panel-heading">Sacred Palettes</p>
          <p className="dawa-theme__panel-sub">Choose a colour that reflects your spirit</p>
        </div>
      </div>

      <div className="dawa-theme__colors">
        {THEME_COLORS.map((c, i) => (
          <motion.button
            key={c}
            type="button"
            className={`dawa-theme__color dawa-theme__color--${c}${color === c ? ' is-active' : ''}`}
            onClick={() => setColor(c as ThemeColor)}
            title={THEME_COLOR_LABELS[c as ThemeColor]}
            aria-label={THEME_COLOR_LABELS[c as ThemeColor]}
            aria-pressed={color === c}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="dawa-theme__color-ring">
              {color === c && (
                <span className="dawa-theme__color-check" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </span>
            <span className="dawa-theme__color-name">{THEME_COLOR_LABELS[c as ThemeColor]}</span>
          </motion.button>
        ))}
      </div>

      <div className="dawa-theme__panel-foot">
        <span className={`dawa-theme__active-dot dawa-theme__preview--${color}`} />
        <span>Active: <strong>{THEME_COLOR_LABELS[color]}</strong></span>
      </div>
    </motion.div>
  );

  return (
    <div className="dawa-theme">
      <button
        ref={triggerRef}
        type="button"
        className={`dawa-theme__trigger${compact ? ' dawa-theme__trigger--compact' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Choose color palette"
        aria-haspopup="dialog"
      >
        <span className={`dawa-theme__preview dawa-theme__preview--${color}`} />
        {!compact && <span className="dawa-theme__label">Palette</span>}
        <svg className="dawa-theme__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {mounted && createPortal(
        <AnimatePresence>{open && panel}</AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
